<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class AdminReturnRequestResource extends CustomerReturnRequestResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'admin_note' => $this->admin_note,
            'receiving_branch' => $this->receivingBranch?->only(['id', 'name', 'code']),
            'customer' => $this->order?->only(['customer_name', 'customer_email', 'customer_phone']),
        ];
    }
}
