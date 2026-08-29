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

        return AfterSalesShipment::updateOrCreate($keys + ['purpose' => $purpose], $data + ['order_id' => $context->order_id, 'created_by' => $actorId]);
    }

    public function updateStatus(AfterSalesShipment $shipment, string $status): AfterSalesShipment
    {
        return DB::transaction(function () use ($shipment, $status) {
            $locked = AfterSalesShipment::lockForUpdate()->findOrFail($shipment->id);
            $allowed = ['pending' => ['shipped'], 'shipped' => ['delivered'], 'delivered' => []];
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
    }
}
