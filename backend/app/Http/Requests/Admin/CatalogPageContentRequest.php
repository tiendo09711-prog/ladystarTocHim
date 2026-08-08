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
        $isHairGuide = $this->route('pageKey') === 'hair-guide';
        $text = fn (int $max) => ['nullable', 'string', 'max:'.$max, 'not_regex:/[<>]/'];
        $rules = [
            'eyebrow' => $text(120),
            'title' => $text(190),
            'subtitle' => $text(2000),
            'hero_image_alt' => $text(190),
            'editorial_title' => $text(190),
            'editorial_intro' => $text(6000),
            'editorial_sections_json' => ['nullable', 'array', $isHairGuide ? 'min:4' : 'max:8', $isHairGuide ? 'max:6' : 'max:8'],
            'editorial_sections_json.*' => ['array:title,body'],
            'editorial_sections_json.*.title' => ['required', 'string', 'max:190', 'not_regex:/[<>]/'],
            'editorial_sections_json.*.body' => ['required', 'string', 'max:4000', 'not_regex:/[<>]/'],
            'consultation_title' => $text(190),
            'consultation_body' => $text(3000),
            'consultation_image_alt' => $text(190),
            'consultation_cta_label' => $text(120),
            'settings_json.trust_items' => ['nullable', 'array', 'max:4'],
            'settings_json.trust_items.*' => ['array:title,description'],
            'settings_json.trust_items.*.title' => ['required', 'string', 'max:120', 'not_regex:/[<>]/'],
            'settings_json.trust_items.*.description' => ['nullable', 'string', 'max:200', 'not_regex:/[<>]/'],
            'settings_json.hero_badge' => ['nullable', 'string', 'max:120', 'not_regex:/[<>]/'],
            'settings_json.consultation_benefits' => ['nullable', 'array', 'max:5'],
            'settings_json.consultation_benefits.*' => ['string', 'max:160', 'not_regex:/[<>]/'],
            'is_active' => ['boolean'],
            'seo' => ['nullable', 'array:title,description,og_image_path'],
            'seo.title' => $text(190),
            'seo.description' => $text(320),
        ];

        if ($isHairGuide) {
            $rules += [
                'settings_json' => ['nullable', 'array:hero_badge,trust_items,guide_grid_title,guide_grid_intro,guide_products,product_primary_cta_label,product_secondary_cta_label,consultation_benefits'],
                'settings_json.guide_grid_title' => $text(190),
                'settings_json.guide_grid_intro' => $text(1000),
                'settings_json.guide_products' => ['nullable', 'array', 'max:12'],
                'settings_json.guide_products.*' => ['array:product_id,badge,note'],
                'settings_json.guide_products.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
                'settings_json.guide_products.*.badge' => ['nullable', 'string', 'max:80', 'not_regex:/[<>]/'],
                'settings_json.guide_products.*.note' => ['nullable', 'string', 'max:240', 'not_regex:/[<>]/'],
                'settings_json.product_primary_cta_label' => $text(80),
                'settings_json.product_secondary_cta_label' => $text(80),
            ];
        } else {
            $rules['settings_json'] = ['nullable', 'array:trust_items,hero_badge,consultation_benefits'];
        }

        return $rules;
    }
}
