<?php

namespace App\Http\Requests\Admin;

use App\Models\AboutSection;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class AboutSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAccessAdmin() === true;
    }

    public function rules(): array
    {
        $sectionId = $this->route('section')?->id ?? $this->route('section');

        return [
            'section_key' => [$this->isMethod('post') ? 'required' : 'sometimes', 'alpha_dash', 'max:60', Rule::unique('about_sections', 'section_key')->ignore($sectionId)],
            'section_type' => [$this->isMethod('post') ? 'required' : 'sometimes', Rule::in(AboutSection::TYPES)],
            'eyebrow' => ['nullable', 'string', 'max:190'],
            'title' => ['nullable', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:1000'],
            'body' => ['nullable', 'string', 'max:20000'],
            'image_alt' => ['nullable', 'string', 'max:190'],
            'secondary_image_alt' => ['nullable', 'string', 'max:190'],
            'cta_label' => ['nullable', 'string', 'max:80'],
            'cta_url' => ['nullable', 'string', 'max:255', 'regex:/^(\/|https?:\/\/)/'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'settings' => ['nullable', 'array'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $settings = $this->input('settings');
            if (! is_array($settings)) {
                return;
            }
            foreach (['items', 'steps'] as $listKey) {
                if (array_key_exists($listKey, $settings) && ! is_array($settings[$listKey])) {
                    $validator->errors()->add("settings.{$listKey}", 'Danh sách phải là mảng.');
                }
            }
            foreach ((array) ($settings['items'] ?? []) as $index => $item) {
                if (! is_array($item)) {
                    $validator->errors()->add("settings.items.{$index}", 'Mục không hợp lệ.');
                    continue;
                }
                if (isset($item['icon']) && ! in_array($item['icon'], AboutSection::ICONS, true)) {
                    $validator->errors()->add("settings.items.{$index}.icon", 'Icon không nằm trong danh sách cho phép.');
                }
                foreach (['title', 'description', 'quote', 'name', 'role', 'label'] as $field) {
                    if (array_key_exists($field, $item) && ! is_string($item[$field])) {
                        $validator->errors()->add("settings.items.{$index}.{$field}", 'Giá trị phải là chuỗi.');
                    }
                }
                if (isset($item['rating']) && (! is_numeric($item['rating']) || $item['rating'] < 1 || $item['rating'] > 5)) {
                    $validator->errors()->add("settings.items.{$index}.rating", 'Đánh giá phải từ 1 đến 5.');
                }
            }
        });
    }
}
