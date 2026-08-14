<?php

namespace App\Http\Requests\Store;

class GuestCheckoutRequest extends CheckoutRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return parent::rules() + [
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.product_variant_id' => ['required', 'integer', 'distinct', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ];
    }
}
