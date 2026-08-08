<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CatalogPageContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        return [
            'eyebrow' => ['nullable', 'string', 'max:120'],
            'title' => ['nullable', 'string', 'max:190'],
            'subtitle' => ['nullable', 'string', 'max:2000'],
            'hero_image_alt' => ['nullable', 'string', 'max:190'],
            'editorial_title' => ['nullable', 'string', 'max:190'],
            'editorial_intro' => ['nullable', 'string', 'max:6000'],
            'editorial_sections_json' => ['nullable', 'array', 'max:8'],
            'editorial_sections_json.*' => ['array:title,body'],
            'editorial_sections_json.*.title' => ['required', 'string', 'max:190'],
            'editorial_sections_json.*.body' => ['required', 'string', 'max:4000'],
            'consultation_title' => ['nullable', 'string', 'max:190'],
            'consultation_body' => ['nullable', 'string', 'max:3000'],
            'consultation_image_alt' => ['nullable', 'string', 'max:190'],
            'consultation_cta_label' => ['nullable', 'string', 'max:120'],
            'settings_json' => ['nullable', 'array:trust_items,hero_badge,consultation_benefits'],
            'settings_json.trust_items' => ['nullable', 'array', 'max:4'],
            'settings_json.trust_items.*' => ['array:title,description'],
            'settings_json.trust_items.*.title' => ['required', 'string', 'max:120'],
            'settings_json.trust_items.*.description' => ['nullable', 'string', 'max:200'],
            'settings_json.hero_badge' => ['nullable', 'string', 'max:120'],
            'settings_json.consultation_benefits' => ['nullable', 'array', 'max:5'],
            'settings_json.consultation_benefits.*' => ['string', 'max:160'],
            'is_active' => ['boolean'],
            'seo' => ['nullable', 'array:title,description,og_image_path'],
            'seo.title' => ['nullable', 'string', 'max:190'],
            'seo.description' => ['nullable', 'string', 'max:320'],
        ];
    }
}
