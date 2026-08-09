<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ContactPageContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        $shortText = fn (int $max) => ['nullable', 'string', 'max:'.$max];
        $icons = ['sparkles', 'heart-handshake', 'shield-check', 'badge-check', 'headphones', 'map-pin', 'messages-square'];

        return [
            'hero_eyebrow' => $shortText(120),
            'hero_title' => $shortText(190),
            'hero_description' => ['nullable', 'string', 'max:3000'],
            'hero_image_alt' => $shortText(190),
            'contact_eyebrow' => $shortText(120),
            'contact_title' => $shortText(190),
            'contact_description' => ['nullable', 'string', 'max:2000'],
            'commitments_eyebrow' => $shortText(120),
            'commitments_title' => $shortText(190),
            'commitments_description' => ['nullable', 'string', 'max:2000'],
            'guide_eyebrow' => $shortText(120),
            'guide_title' => $shortText(190),
            'guide_description' => ['nullable', 'string', 'max:3000'],
            'guide_image_alt' => $shortText(190),
            'guide_quote' => ['nullable', 'string', 'max:2000'],
            'branches_eyebrow' => $shortText(120),
            'branches_title' => $shortText(190),
            'branches_description' => ['nullable', 'string', 'max:2000'],
            'form_eyebrow' => $shortText(120),
            'form_title' => $shortText(190),
            'form_description' => ['nullable', 'string', 'max:2000'],
            'settings' => ['nullable', 'array'],
            'settings.hero_primary_label' => $shortText(120),
            'settings.hero_primary_url' => ['nullable', 'string', 'max:500', $this->safeUrlRule()],
            'settings.hero_secondary_label' => $shortText(120),
            'settings.hero_secondary_url' => ['nullable', 'string', 'max:500', $this->safeUrlRule()],
            'settings.hotline_label' => $shortText(120),
            'settings.email_label' => $shortText(120),
            'settings.hours_label' => $shortText(120),
            'settings.hours_value' => $shortText(190),
            'settings.branch_call_label' => $shortText(120),
            'settings.branch_directions_label' => $shortText(120),
            'settings.form_name_label' => $shortText(120),
            'settings.form_phone_label' => $shortText(120),
            'settings.form_service_label' => $shortText(120),
            'settings.form_branch_label' => $shortText(120),
            'settings.form_message_label' => $shortText(120),
            'settings.form_submit_label' => $shortText(120),
            'settings.form_success_message' => $shortText(500),
            'settings.privacy_note' => $shortText(500),
            'settings.services' => ['nullable', 'array', 'max:30'],
            'settings.services.*' => ['string', 'max:190'],
            'settings.commitments' => ['nullable', 'array', 'max:8'],
            'settings.commitments.*.icon' => ['nullable', Rule::in($icons)],
            'settings.commitments.*.title' => ['required_with:settings.commitments', 'string', 'max:190'],
            'settings.commitments.*.description' => ['nullable', 'string', 'max:1000'],
            'settings.guide_points' => ['nullable', 'array', 'max:20'],
            'settings.guide_points.*' => ['string', 'max:1000'],
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
