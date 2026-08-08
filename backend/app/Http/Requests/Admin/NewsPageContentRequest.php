<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class NewsPageContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        $text = fn (int $max) => ['nullable', 'string', 'max:'.$max];

        return [
            'eyebrow' => $text(120),
            'title' => $text(190),
            'description' => ['nullable', 'string', 'max:2000'],
            'featured_article_id' => ['nullable', 'integer', 'exists:news_articles,id'],
            'featured_badge_label' => $text(120),
            'list_eyebrow' => $text(120),
            'list_title' => $text(190),
            'list_description' => ['nullable', 'string', 'max:1000'],
            'show_cta' => ['boolean'],
            'cta_eyebrow' => $text(120),
            'cta_title' => $text(190),
            'cta_description' => ['nullable', 'string', 'max:2000'],
            'cta_primary_label' => $text(120),
            'cta_primary_url' => ['nullable', 'string', 'max:500', function ($attribute, $value, $fail) {
                if (! $value) return;
                if ($this->isUnsafeUrl($value)) $fail('URL CTA không hợp lệ.');
            }],
            'cta_secondary_label' => $text(120),
            'cta_secondary_url' => ['nullable', 'string', 'max:500', function ($attribute, $value, $fail) {
                if (! $value) return;
                if ($this->isUnsafeUrl($value)) $fail('URL CTA không hợp lệ.');
            }],
            'cta_image_alt' => $text(190),
            'seo' => ['nullable', 'array:title,description'],
            'seo.title' => ['nullable', 'string', 'max:190'],
            'seo.description' => ['nullable', 'string', 'max:320'],
        ];
    }

    public function validatedContent(): array
    {
        return $this->safe()->except(['seo']);
    }

    public function validatedSeo(): ?array
    {
        $seo = $this->safe()->only('seo')['seo'] ?? null;
        if (! is_array($seo)) return null;

        return $seo;
    }

    private function isUnsafeUrl(string $value): bool
    {
        $lower = strtolower($value);

        if (str_starts_with($lower, 'javascript:') || str_starts_with($lower, 'data:')) return true;

        if (str_starts_with($value, '/') && ! str_starts_with($value, '//')) return false;

        if (str_starts_with($lower, 'http://') || str_starts_with($lower, 'https://')) return false;

        return true;
    }
}
