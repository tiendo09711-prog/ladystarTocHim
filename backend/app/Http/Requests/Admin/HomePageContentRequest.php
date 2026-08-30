<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class HomePageContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAccessAdmin() === true;
    }

    protected function prepareForValidation(): void
    {
        if (! is_array($this->announcement_messages)) return;

        $this->merge([
            'announcement_messages' => array_values(array_filter(
                array_map(fn (mixed $message) => is_string($message) ? trim($message) : $message, $this->announcement_messages),
                fn (mixed $message) => $message !== '' && $message !== null,
            )),
        ]);
    }

    public function rules(): array
    {
        $rules = [
            'announcement_enabled' => ['required', 'boolean'],
            'announcement_messages' => ['required_if:announcement_enabled,true', 'array', 'max:12'],
            'announcement_messages.*' => ['string', 'max:190'],
            'announcement_interval_seconds' => ['required', 'integer', 'min:3', 'max:30'],
            'hero_image_alt' => ['nullable', 'string', 'max:190'],
            'sections' => ['required', 'array:hero,consultation,products,brand_story,solutions,styles,process,testimonials,contact,insights,final_cta,floating_contact'],
        ];

        $textFields = [
            'hero' => ['eyebrow', 'title', 'description', 'primary_label', 'secondary_label', 'note_label', 'note_value'],
            'consultation' => ['kicker', 'title', 'description', 'cta_label'],
            'products' => ['kicker', 'title', 'description', 'featured_label', 'view_all_label'],
            'brand_story' => ['kicker', 'title', 'description', 'image_alt', 'cta_label'],
            'solutions' => ['kicker', 'title', 'description', 'cta_label', 'art_text', 'image_alt'],
            'styles' => ['kicker', 'title'],
            'process' => ['kicker', 'title', 'description', 'cta_label'],
            'testimonials' => ['kicker', 'title'],
            'contact' => ['kicker', 'title', 'description'],
            'insights' => ['kicker', 'title'],
            'final_cta' => ['kicker', 'title', 'description', 'primary_label', 'secondary_label'],
            'floating_contact' => ['trigger_label', 'consultation_label', 'guide_label'],
        ];

        foreach ($textFields as $section => $fields) {
            foreach ($fields as $field) {
                $rules["sections.{$section}.{$field}"] = ['required', 'string', 'max:500'];
            }
        }

        foreach ([
            'hero.primary_url', 'hero.secondary_url', 'consultation.cta_url', 'products.view_all_url',
            'brand_story.cta_url', 'solutions.cta_url', 'process.cta_url', 'final_cta.primary_url',
            'final_cta.secondary_url', 'floating_contact.consultation_url', 'floating_contact.guide_url',
        ] as $field) {
            $rules["sections.{$field}"] = ['required', 'string', 'max:255', $this->safeUrlRule()];
        }

        foreach (['hero.trust_items', 'consultation.options', 'solutions.bullets'] as $field) {
            $rules["sections.{$field}"] = ['required', 'array', 'min:1', 'max:12'];
            $rules["sections.{$field}.*"] = ['required', 'string', 'max:190'];
        }

        foreach ([
            'hero.image_position_x', 'hero.image_position_y',
            'brand_story.image_position_x', 'brand_story.image_position_y',
            'solutions.image_position_x', 'solutions.image_position_y',
            'styles.items.*.image_position_x', 'styles.items.*.image_position_y',
            'process.steps.*.image_position_x', 'process.steps.*.image_position_y',
            'testimonials.items.*.image_position_x', 'testimonials.items.*.image_position_y',
        ] as $field) {
            $rules["sections.{$field}"] = ['sometimes', 'numeric', 'min:0', 'max:100'];
        }

        $rules += [
            'sections.brand_story.values' => ['required', 'array', 'min:1', 'max:8'],
            'sections.brand_story.values.*.title' => ['required', 'string', 'max:120'],
            'sections.brand_story.values.*.description' => ['required', 'string', 'max:500'],
            'sections.styles.items' => ['required', 'array', 'min:1', 'max:6'],
            'sections.styles.items.*.title' => ['required', 'string', 'max:120'],
            'sections.styles.items.*.description' => ['required', 'string', 'max:500'],
            'sections.styles.items.*.url' => ['required', 'string', 'max:255'],
            'sections.styles.items.*.image_alt' => ['nullable', 'string', 'max:190'],
            'sections.process.steps' => ['required', 'array', 'min:1', 'max:8'],
            'sections.process.steps.*.number' => ['required', 'string', 'max:10'],
            'sections.process.steps.*.title' => ['required', 'string', 'max:120'],
            'sections.process.steps.*.description' => ['required', 'string', 'max:500'],
            'sections.process.steps.*.image_alt' => ['nullable', 'string', 'max:190'],
            'sections.testimonials.items' => ['required', 'array', 'min:1', 'max:8'],
            'sections.testimonials.items.*.quote' => ['required', 'string', 'max:700'],
            'sections.testimonials.items.*.customer' => ['required', 'string', 'max:120'],
            'sections.testimonials.items.*.label' => ['required', 'string', 'max:120'],
            'sections.testimonials.items.*.detail_title' => ['required', 'string', 'max:190'],
            'sections.testimonials.items.*.detail' => ['required', 'string', 'max:5000'],
            'sections.testimonials.items.*.image_alt' => ['nullable', 'string', 'max:190'],
            'sections.contact.cards' => ['required', 'array', 'min:1', 'max:4'],
            'sections.contact.cards.*.title' => ['required', 'string', 'max:120'],
            'sections.contact.cards.*.description' => ['required', 'string', 'max:500'],
            'sections.contact.cards.*.url' => ['required', 'string', 'max:255'],
            'sections.insights.items' => ['required', 'array', 'min:1', 'max:6'],
            'sections.insights.items.*.title' => ['required', 'string', 'max:120'],
            'sections.insights.items.*.description' => ['required', 'string', 'max:500'],
            'sections.insights.items.*.url' => ['required', 'string', 'max:255'],
        ];

        foreach (['solutions.image_path', 'styles.items.*.image_path', 'process.steps.*.image_path', 'testimonials.items.*.image_path'] as $field) {
            $rules["sections.{$field}"] = ['nullable', 'string', 'max:500', $this->homeImagePathRule()];
        }

        return $rules;
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

    private function homeImagePathRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            if ($value === null || $value === '') return;
            if (! is_string($value) || ! preg_match('#^home-page/(solutions|styles|process|testimonials)/[a-f0-9-]+\.(jpe?g|png|webp)$#i', $value)) {
                $fail('Đường dẫn ảnh trang chủ không hợp lệ.');
            }
        };
    }
}
