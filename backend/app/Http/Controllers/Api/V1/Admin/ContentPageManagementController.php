<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContentPage;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class ContentPageManagementController extends Controller
{
    use ApiResponse;

    private const PAGE_KEYS = ['chinh-sach-giao-hang', 'chinh-sach-doi-tra', 'chinh-sach-bao-mat'];

    public function index()
    {
        return $this->success(ContentPage::query()->whereIn('page_key', self::PAGE_KEYS)->orderBy('page_key')->get());
    }

    public function show(string $pageKey)
    {
        abort_unless(in_array($pageKey, self::PAGE_KEYS, true), 404);
        return $this->success(ContentPage::query()->where('page_key', $pageKey)->first());
    }

    public function update(Request $request, string $pageKey)
    {
        abort_unless(in_array($pageKey, self::PAGE_KEYS, true), 404);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:190'],
            'summary' => ['nullable', 'string', 'max:5000'],
            'content' => ['nullable', 'array'],
            'content.intro' => ['nullable', 'string', 'max:5000'],
            'content.sections' => ['nullable', 'array', 'max:50'],
            'content.sections.*.title' => ['required', 'string', 'max:190'],
            'content.sections.*.body' => ['nullable', 'string', 'max:10000'],
            'content.sections.*.items' => ['nullable', 'array', 'max:50'],
            'content.sections.*.items.*' => ['string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
            'seo_title' => ['nullable', 'string', 'max:190'],
            'seo_description' => ['nullable', 'string', 'max:5000'],
        ]);
        $page = ContentPage::query()->firstOrNew(['page_key' => $pageKey]);
        $page->fill($data);
        $page->published_at = $data['is_active'] ? ($page->published_at ?? now()) : null;
        $page->save();

        return $this->success($page->refresh(), 'Đã lưu nội dung trang.');
    }
}
