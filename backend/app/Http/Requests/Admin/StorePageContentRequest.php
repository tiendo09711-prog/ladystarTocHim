<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StorePageContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        $shortText = fn (int $max) => ['nullable', 'string', 'max:'.$max];

        return [
            'eyebrow' => $shortText(120),
            'title' => $shortText(190),
            'description' => ['nullable', 'string', 'max:3000'],
            'hero_image_alt' => $shortText(190),
            'locations_eyebrow' => $shortText(120),
            'locations_title' => $shortText(190),
            'locations_description' => ['nullable', 'string', 'max:2000'],
            'empty_title' => $shortText(190),
            'empty_description' => ['nullable', 'string', 'max:1000'],
            'support_title' => $shortText(190),
            'support_description' => ['nullable', 'string', 'max:1500'],
            'process_eyebrow' => $shortText(120),
            'process_title' => $shortText(190),
            'process_description' => ['nullable', 'string', 'max:1500'],
            'policies_eyebrow' => $shortText(120),
            'policies_title' => $shortText(190),
            'policies_description' => ['nullable', 'string', 'max:1500'],
            'contact_eyebrow' => $shortText(120),
            'contact_title' => $shortText(190),
            'contact_description' => ['nullable', 'string', 'max:2000'],
            'contact_image_alt' => $shortText(190),
            'settings' => ['nullable', 'array'],
            'settings.services' => ['nullable', 'array', 'max:20'],
            'settings.services.*' => ['string', 'max:190'],
            'settings.region_all_label' => $shortText(80),
            'settings.details_label' => $shortText(80),
            'settings.directions_label' => $shortText(80),
            'settings.call_label' => $shortText(80),
            'settings.booking_label' => $shortText(80),
            'settings.support_cta_label' => $shortText(120),
            'settings.support_cta_url' => ['nullable', 'string', 'max:500', $this->safeUrlRule()],
            'settings.form_name_label' => $shortText(120),
            'settings.form_phone_label' => $shortText(120),
            'settings.form_service_label' => $shortText(120),
            'settings.form_branch_label' => $shortText(120),
            'settings.form_message_label' => $shortText(120),
            'settings.form_submit_label' => $shortText(120),
            'settings.form_success_message' => $shortText(500),
            'seo' => ['nullable', 'array:title,description'],
            'seo.title' => ['required_with:seo', 'string', 'max:190'],
            'seo.description' => $shortText(320),
        ];
    }

    private function safeUrlRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            if (! is_string($value) || $value === '') return;
            $lower = strtolower($value);
            $isRelative = str_starts_with($value, '/') && ! str_starts_with($value, '//');
            $isAnchor = str_starts_with($value, '#');
            $isHttp = str_starts_with($lower, 'http://') || str_starts_with($lower, 'https://');
            if (! $isRelative && ! $isAnchor && ! $isHttp) $fail('URL không hợp lệ.');
        };
    }
}
