<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ConsultationRequestStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'min:8', 'max:30'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'service_id' => ['nullable', 'integer', Rule::exists('services', 'id')->where(fn ($query) => $query->where('status', 'active')->whereNull('deleted_at'))],
            'service_name' => ['nullable', 'string', 'max:190'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'source_page' => ['required', 'string', 'max:120'],
            'message' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
