<?php

namespace App\Services;

use App\Models\AfterSalesShipment;
use App\Models\ReturnRequest;
use App\Models\WarrantyRequest;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AfterSalesShipmentService
{
    public function save(Model $context, string $purpose, array $data, int $actorId): AfterSalesShipment
    {
        $this->assertContextPurpose($context, $purpose);
        $keys = $context instanceof ReturnRequest ? ['return_request_id' => $context->id] : ['warranty_request_id' => $context->id];

        return DB::transaction(function () use ($context, $purpose, $data, $actorId, $keys) {
            $shipment = AfterSalesShipment::where($keys + ['purpose' => $purpose])->lockForUpdate()->first();
            if ($shipment) {
                if (! in_array($shipment->status, ['pending', 'delivery_failed'], true)) {
                    throw ValidationException::withMessages(['shipment' => 'Shipment metadata cannot be edited after dispatch.']);
                }
                $shipment->update($data);

                return $shipment->refresh();
            }
            if (in_array($purpose, ['exchange_outbound', 'warranty_outbound'], true) && $context->status === 'completed') {
                throw ValidationException::withMessages(['shipment' => 'Outbound shipment cannot be created after fulfilment is completed.']);
            }

            return AfterSalesShipment::create($keys + ['purpose' => $purpose] + $data + [
                'order_id' => $context->order_id,
                'created_by' => $actorId,
            ]);
        });
    }

    public function updateStatus(AfterSalesShipment $shipment, string $status, ?string $reason = null): AfterSalesShipment
    {
        return DB::transaction(function () use ($shipment, $status, $reason) {
            $locked = AfterSalesShipment::lockForUpdate()->findOrFail($shipment->id);
            $allowed = [
                'pending' => ['shipped'],
                'shipped' => ['delivered', 'delivery_failed'],
                'delivery_failed' => ['shipped', 'returned'],
                'returned' => ['shipped'],
                'delivered' => [],
            ];
            if ($locked->status === $status) {
                return $locked;
            }
            if (! in_array($status, $allowed[$locked->status] ?? [], true)) {
                throw ValidationException::withMessages(['status' => 'Chuyển trạng thái vận chuyển hậu mãi không hợp lệ.']);
            }
            $updates = ['status' => $status];
            if ($status === 'shipped') {
                $updates['shipped_at'] = now();
            }
            if ($status === 'delivered') {
                $updates['delivered_at'] = now();
            }
            if ($status === 'delivery_failed') {
                $updates['failed_at'] = now();
                $updates['failure_reason'] = $reason;
            }
            if ($status === 'returned') {
                $updates['returned_at'] = now();
                $updates['return_reason'] = $reason;
            }
            $locked->update($updates);

            return $locked->refresh();
        });
    }

    private function assertContextPurpose(Model $context, string $purpose): void
    {
        $valid = $context instanceof ReturnRequest ? ['return_inbound', 'exchange_outbound']
            : ($context instanceof WarrantyRequest ? ['warranty_inbound', 'warranty_outbound'] : []);
        if (! in_array($purpose, $valid, true)) {
            throw ValidationException::withMessages(['purpose' => 'Mục đích vận chuyển không phù hợp.']);
        }
        if ($context instanceof ReturnRequest && $purpose === 'exchange_outbound' && $context->request_type !== 'exchange') {
            throw ValidationException::withMessages(['purpose' => 'Only exchange requests can have an exchange outbound shipment.']);
        }
    }
}
