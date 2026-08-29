<?php

namespace App\Http\Requests\Store;

use App\Support\PhoneNormalizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CheckoutRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['customer_phone' => PhoneNormalizer::normalize($this->input('customer_phone'))]);
    }

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:120'],
            'customer_email' => ['required', 'email'],
            'customer_phone' => ['required', 'regex:/^[0-9+\s.-]{9,20}$/'],
            'province' => ['required', 'string'], 'district' => ['required', 'string'], 'ward' => ['required', 'string'],
            'shipping_address' => ['required', 'string', 'max:255'],
            'payment_method' => ['required', Rule::in(['cod', 'bank_transfer'])],
            'coupon_code' => ['nullable', 'string'], 'customer_note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
