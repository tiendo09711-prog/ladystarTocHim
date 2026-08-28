<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePageItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAccessAdmin() === true;
    }

    public function rules(): array
    {
        return [
            'item_type' => ['required', Rule::in(['process', 'policy'])],
            'title' => ['required', 'string', 'max:190'],
            'description' => ['nullable', 'string', 'max:1500'],
            'image_alt' => ['nullable', 'string', 'max:190'],
            'icon' => ['nullable', Rule::in(['calendar-days', 'messages-square', 'sparkles', 'badge-check', 'heart-handshake', 'refresh-cw', 'headphones', 'shield-check', 'package-check', 'map-pin'])],
            'sort_order' => ['integer', 'min:0', 'max:999'],
            'is_active' => ['boolean'],
        ];
    }
}
