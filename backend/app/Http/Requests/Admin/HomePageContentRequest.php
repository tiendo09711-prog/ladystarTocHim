<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class HomePageContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
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
        return [
            'announcement_enabled' => ['required', 'boolean'],
            'announcement_messages' => ['required_if:announcement_enabled,true', 'array', 'max:12'],
            'announcement_messages.*' => ['string', 'max:190'],
            'announcement_interval_seconds' => ['required', 'integer', 'min:3', 'max:30'],
        ];
    }
}
