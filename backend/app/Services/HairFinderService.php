<?php

namespace App\Services;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StoreSetting;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class HairFinderService
{
    public function options(): array
    {
        $config = $this->config();

        return [
            'content' => Arr::get($config, 'content', []),
            'actions' => Arr::get($config, 'actions', []),
            'format' => [...Arr::get($config, 'format', []), 'currency' => StoreSetting::query()->value('currency') ?: ''],
            'questions' => collect(Arr::get($config, 'questions', []))
                ->map(fn (array $question) => $this->enrichQuestion($question, $config))
                ->values()
                ->all(),
        ];
    }

    public function validationRules(): array
    {
        $rules = [];

        foreach ($this->options()['questions'] as $question) {
            $key = (string) ($question['key'] ?? '');
            $type = (string) ($question['type'] ?? '');

            if ($type === 'single' && $key !== '') {
                $rules[$key] = ['nullable', Rule::in($this->choiceValues($question))];
            }

            if ($type === 'multiple' && $key !== '') {
                $values = $this->choiceValues($question);
                $rules[$key] = ['sometimes', 'array', 'max:'.count($values)];
                $rules[$key.'.*'] = [Rule::in($values)];
            }

            if ($type === 'budget') {
                $rules['budget_min'] = ['nullable', 'numeric', 'min:0'];
                $rules['budget_max'] = ['nullable', 'numeric', 'gte:budget_min'];
            }

            if ($type === 'select_group') {
                foreach ((array) ($question['fields'] ?? []) as $field) {
                    $fieldKey = (string) ($field['key'] ?? '');
                    if ($fieldKey === '') {
                        continue;
                    }

                    $rules[$fieldKey] = ['nullable', 'string', Rule::in(collect($field['choices'] ?? [])->pluck('value')->all())];
                }
            }
        }

        return $rules;
    }

    public function recommend(array $answers): array
    {
        $config = $this->config();
        $query = Product::where('status', 'active')->with([
            'category', 'brand', 'images',
            'variants' => fn ($variant) => $variant->where('status', 'active')->with('attributeValues.attribute', 'inventories'),
        ])->withAvg(['reviews' => fn ($review) => $review->where('status', 'approved')], 'rating')
            ->withCount(['reviews' => fn ($review) => $review->where('status', 'approved')])
            ->withSum(['orderItems as sold_count' => fn ($item) => $item->whereHas('order', fn ($order) => $order->where('order_status', 'completed'))], 'quantity')
            ->whereHas('variants', fn ($variant) => $this->purchasableVariantQuery($variant));

        if (isset($answers['budget_min']) || isset($answers['budget_max'])) {
            $query->whereHas('variants', function ($variant) use ($answers) {
                $this->purchasableVariantQuery($variant)
                    ->when(isset($answers['budget_min']), fn ($row) => $row->whereRaw('COALESCE(sale_price, price) >= ?', [$answers['budget_min']]))
                    ->when(isset($answers['budget_max']), fn ($row) => $row->whereRaw('COALESCE(sale_price, price) <= ?', [$answers['budget_max']]));
            });
        }

        $limit = max(1, (int) Arr::get($config, 'scoring.result_limit', 1));

        return $query->get()->map(fn (Product $product) => $this->score($product, $answers, $config))
            ->sort(fn ($left, $right) => $right['score'] <=> $left['score'] ?: $left['product']['id'] <=> $right['product']['id'])
            ->take($limit)
            ->values()
            ->all();
    }

    private function config(): array
    {
        return StoreSetting::query()->value('hair_finder_config') ?: [];
    }

    private function purchasableVariantQuery($query)
    {
        return $query->where('status', 'active')
            ->whereHas('inventories', fn ($inventory) => $inventory->whereColumn('quantity_on_hand', '>', 'quantity_reserved'));
    }

    private function enrichQuestion(array $question, array $config): array
    {
        if (($question['type'] ?? null) === 'budget') {
            $question['choices'] = $this->budgetChoices((array) Arr::get($config, 'budget', []));
        }

        if (($question['type'] ?? null) === 'select_group') {
            $question['fields'] = collect($question['fields'] ?? [])->map(function (array $field) {
                $source = (string) ($field['source'] ?? '');
                $field['choices'] = $this->productFieldChoices($source);

                return $field;
            })->values()->all();
        }

        return $question;
    }

    private function budgetChoices(array $config): array
    {
        $labels = collect($config['labels'] ?? [])->filter(fn ($label) => is_string($label) && $label !== '')->values();
        if ($labels->isEmpty()) {
            return [];
        }

        $prices = ProductVariant::where('status', 'active')
            ->whereHas('product', fn ($query) => $query->where('status', 'active'))
            ->whereHas('inventories', fn ($query) => $query->whereColumn('quantity_on_hand', '>', 'quantity_reserved'))
            ->get(['price', 'sale_price'])
            ->map(fn ($variant) => (float) $variant->currentPrice())
            ->sort()
            ->values();

        if ($prices->isEmpty()) {
            return [];
        }

        $minimum = (int) floor((float) $prices->first());
        $maximum = (int) ceil((float) $prices->last());
        $roundingStep = max(1, (int) ($config['rounding_step'] ?? 1));
        $minimumStep = max(1, (int) ($config['minimum_step'] ?? 1));
        $step = max($minimumStep, (int) ceil(max(1, $maximum - $minimum) / $labels->count() / $roundingStep) * $roundingStep);

        return $labels->map(function (string $label, int $index) use ($labels, $minimum, $maximum, $step) {
            $rangeMinimum = min($maximum, $minimum + ($index * $step));
            $rangeMaximum = $index === $labels->count() - 1 ? $maximum : min($maximum, $minimum + (($index + 1) * $step));

            return ['value' => (string) $index, 'label' => $label, 'min' => $rangeMinimum, 'max' => $rangeMaximum];
        })->all();
    }

    private function productFieldChoices(string $source): array
    {
        if ($source === '' || ! Schema::hasColumn('products', $source)) {
            return [];
        }

        return Product::where('status', 'active')
            ->whereNotNull($source)
            ->where($source, '!=', '')
            ->distinct()
            ->orderBy($source)
            ->pluck($source)
            ->map(fn ($value) => ['value' => (string) $value, 'label' => (string) $value])
            ->values()
            ->all();
    }

    private function choiceValues(array $question): array
    {
        return collect($question['choices'] ?? [])->pluck('value')->filter(fn ($value) => is_string($value))->values()->all();
    }

    private function score(Product $product, array $answers, array $config): array
    {
        $scoring = (array) Arr::get($config, 'scoring', []);
        $baseRule = (array) ($scoring['base'] ?? []);
        $score = (int) ($baseRule['weight'] ?? 0);
        $reasons = filled($baseRule['reason'] ?? null) ? [(string) $baseRule['reason']] : [];
        $purchasableVariants = $product->variants->filter(fn ($variant) => $variant->status === 'active' && $variant->availableStock() > 0);
        $prices = $purchasableVariants->map->currentPrice();
        $budgetRule = (array) ($scoring['budget'] ?? []);

        if ((isset($answers['budget_min']) || isset($answers['budget_max'])) && $prices->contains(fn ($price) => (! isset($answers['budget_min']) || $price >= $answers['budget_min']) && (! isset($answers['budget_max']) || $price <= $answers['budget_max']))) {
            $this->applyRule($score, $reasons, $budgetRule);
        }

        foreach ((array) ($scoring['field_matches'] ?? []) as $field => $rule) {
            if (! empty($answers[$field]) && Str::lower((string) $product->{$field}) === Str::lower((string) $answers[$field])) {
                $this->applyRule($score, $reasons, (array) $rule);
            }
        }

        $lengthRule = (array) ($scoring['length'] ?? []);
        if (! empty($answers['length']) && $this->matchesLength($purchasableVariants, (string) $answers['length'], $lengthRule)) {
            $this->applyRule($score, $reasons, $lengthRule);
        }

        foreach ((array) ($scoring['choice_rules'] ?? []) as $answerKey => $choiceRules) {
            foreach (Arr::wrap($answers[$answerKey] ?? []) as $choice) {
                $rule = (array) ($choiceRules[$choice] ?? []);
                if ($rule !== [] && $this->matchesConfiguredRule($product, $purchasableVariants, $rule)) {
                    $this->applyRule($score, $reasons, $rule);
                }
            }
        }

        $score += min((int) Arr::get($scoring, 'rating.max_bonus', 0), (int) round((float) ($product->reviews_avg_rating ?? 0)));

        return [
            'product' => (new ProductResource($product))->resolve(),
            'score' => min((int) ($scoring['max_score'] ?? $score), $score),
            'reasons' => array_values(array_unique($reasons)),
        ];
    }

    private function applyRule(int &$score, array &$reasons, array $rule): void
    {
        $score += (int) ($rule['weight'] ?? 0);

        if (filled($rule['reason'] ?? null)) {
            $reasons[] = (string) $rule['reason'];
        }
    }

    private function matchesLength($variants, string $choice, array $config): bool
    {
        $rule = (array) Arr::get($config, 'choices.'.$choice, []);
        if ($rule === []) {
            return false;
        }

        $attributeCodes = collect($config['attribute_codes'] ?? [])->map(fn ($value) => Str::lower((string) $value));
        $values = $variants->flatMap->attributeValues
            ->filter(fn ($value) => $attributeCodes->contains(Str::lower((string) $value->attribute?->code)))
            ->pluck('display_value')
            ->map(fn ($value) => Str::lower((string) $value));

        return $values->contains(function (string $value) use ($rule) {
            if (Str::contains($value, (array) ($rule['keywords'] ?? []))) {
                return true;
            }

            preg_match_all('/\d+(?:[.,]\d+)?(?=\s*cm\b)/u', $value, $matches);

            return collect($matches[0] ?? [])->contains(function ($measurement) use ($rule) {
                $centimeters = (float) str_replace(',', '.', $measurement);

                return (! isset($rule['min_cm']) || $centimeters >= (float) $rule['min_cm'])
                    && (! isset($rule['max_cm']) || $centimeters <= (float) $rule['max_cm']);
            });
        });
    }

    private function matchesConfiguredRule(Product $product, $purchasableVariants, array $rule): bool
    {
        $fields = collect($rule['fields'] ?? [])->filter(fn ($field) => is_string($field) && $field !== '');
        $keywords = collect($rule['keywords'] ?? [])->filter(fn ($keyword) => is_string($keyword) && $keyword !== '')->map(fn ($keyword) => Str::lower($keyword))->all();
        $values = $fields->map(fn (string $field) => $product->{$field} ?? null)->filter();

        return match ($rule['matcher'] ?? null) {
            'keywords' => $keywords !== [] && Str::contains(Str::lower($values->implode(' ')), $keywords),
            'fields_or_keywords' => $values->isNotEmpty() || ($keywords !== [] && Str::contains(Str::lower($values->implode(' ')), $keywords)),
            'fields_present' => $values->isNotEmpty(),
            'sale_price' => $purchasableVariants->contains(fn ($variant) => $variant->sale_price !== null),
            default => false,
        };
    }
}
