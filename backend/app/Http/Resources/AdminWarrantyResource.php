<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class AdminWarrantyResource extends CustomerWarrantyResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + ['admin_note' => $this->admin_note, 'customer' => $this->order?->only(['customer_name', 'customer_email', 'customer_phone']), 'receiving_branch' => $this->receivingBranch?->only(['id', 'name', 'code'])];
    }
}
