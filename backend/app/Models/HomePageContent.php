<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HomePageContent extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'announcement_messages' => 'array',
            'announcement_interval_seconds' => 'integer',
            'announcement_enabled' => 'boolean',
            'sections' => 'array',
        ];
    }

    public static function current(): self
    {
        $content = self::firstOrCreate(['page_key' => 'home'], [
            'announcement_messages' => [
                'Miễn phí giao hàng cho đơn từ 1.000.000đ',
                'Tư vấn lựa chọn theo phong cách riêng',
            ],
            'announcement_interval_seconds' => 5,
            'announcement_enabled' => true,
            'sections' => self::defaultSections(),
        ]);

        if (! $content->sections) {
            $content->update(['sections' => self::defaultSections()]);
        }

        return $content;
    }

    public function normalizedSections(): array
    {
        $sections = self::defaultSections();

        foreach ($this->sections ?? [] as $key => $values) {
            if (isset($sections[$key]) && is_array($values)) {
                $defaults = $sections[$key];
                $sections[$key] = array_replace($defaults, $values);

                foreach (['values', 'items', 'steps', 'cards'] as $listKey) {
                    if (! isset($values[$listKey]) || ! is_array($values[$listKey])) continue;

                    $defaultItems = is_array($defaults[$listKey] ?? null) ? $defaults[$listKey] : [];
                    $sections[$key][$listKey] = array_values(array_map(
                        fn (mixed $item, int $index) => is_array($item)
                            ? array_replace($defaultItems[$index] ?? $defaultItems[0] ?? [], $item)
                            : $item,
                        $values[$listKey],
                        array_keys($values[$listKey]),
                    ));
                }
            }
        }

        return $sections;
    }

    public static function defaultSections(): array
    {
        return config('homepage.sections');
    }
}
