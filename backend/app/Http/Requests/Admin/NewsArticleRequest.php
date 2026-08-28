<?php

namespace App\Http\Requests\Admin;

use App\Models\NewsArticle;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class NewsArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAccessAdmin() === true;
    }

    public function rules(): array
    {
        $articleId = $this->route('article')?->id ?? $this->route('article');
        $isPromotion = $this->is('api/v1/admin/promotions*');

        $rules = [
            'title' => ['required', 'string', 'max:190'],
            'slug' => ['required', 'string', 'max:190', 'regex:/^[a-z0-9-]+$/', Rule::unique('news_articles', 'slug')->ignore($articleId)],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'content' => ['nullable', 'string', 'max:60000'],
            'cover_image_alt' => ['nullable', 'string', 'max:190'],
            'content_image_alt' => ['nullable', 'string', 'max:190'],
            'video_url' => ['nullable', 'string', 'max:500', function ($attribute, $value, $fail) {
                if (! $value) return;
                $scheme = strtolower((string) parse_url($value, PHP_URL_SCHEME));
                if (! in_array($scheme, ['http', 'https'], true)) $fail('URL video phải bắt đầu bằng http:// hoặc https://.');
            }],
            'video_title' => ['nullable', 'string', 'max:190'],
            'category' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(NewsArticle::STATUSES)],
            'published_at' => ['nullable', 'date'],
            'seo_title' => ['nullable', 'string', 'max:190'],
            'seo_description' => ['nullable', 'string', 'max:320'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'promotion_badge' => ['nullable', 'string', 'max:120'],
            'promotion_conditions' => ['nullable', 'string', 'max:5000'],
            'promotion_starts_at' => ['nullable', 'date'],
            'promotion_ends_at' => ['nullable', 'date', 'after_or_equal:promotion_starts_at'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['integer', Rule::exists('products', 'id')->where(fn ($query) => $query->whereNull('deleted_at')->where('status', 'active'))],
        ];

        if ($isPromotion && $this->input('status') === 'published') {
            $rules['promotion_conditions'] = ['required', 'string', 'max:5000'];
            $rules['product_ids'] = ['required', 'array', 'min:1'];
        }

        return $rules;
    }
}
