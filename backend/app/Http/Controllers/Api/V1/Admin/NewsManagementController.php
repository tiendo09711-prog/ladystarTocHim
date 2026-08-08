<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\NewsArticleRequest;
use App\Models\NewsArticle;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class NewsManagementController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = NewsArticle::with('author:id,name')->orderByDesc('created_at');
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(fn ($q) => $q->where('title', 'like', '%'.$search.'%')->orWhere('slug', 'like', '%'.$search.'%'));
        }

        return $this->success($query->paginate(15));
    }

    public function show(NewsArticle $article)
    {
        return $this->success($article->load('author:id,name'));
    }

    public function store(NewsArticleRequest $request)
    {
        $data = $this->prepareData($request->validated());
        $article = NewsArticle::create($data + ['author_id' => $request->user()->id]);
        $this->guardPublishable($article);

        return $this->success($article->fresh(), 'Đã tạo bản tin.', 201);
    }

    public function update(NewsArticleRequest $request, NewsArticle $article)
    {
        $article->update($this->prepareData($request->validated()));
        $this->guardPublishable($article->fresh());

        return $this->success($article->fresh(), 'Đã lưu bản tin.');
    }

    public function destroy(NewsArticle $article)
    {
        $this->removeCoverFile($article);
        $article->delete();

        return $this->success(null, 'Đã xóa bản tin.');
    }

    public function status(Request $request, NewsArticle $article)
    {
        $data = $request->validate(['status' => ['required', Rule::in(NewsArticle::STATUSES)]]);
        $article->status = $data['status'];
        if ($article->status === 'published' && ! $article->published_at) {
            $article->published_at = now();
        }
        $this->guardPublishable($article);
        $article->save();

        return $this->success($article->fresh());
    }

    public function uploadCover(Request $request, NewsArticle $article)
    {
        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'cover_image_alt' => ['nullable', 'string', 'max:190'],
        ]);
        $path = $data['image']->storePubliclyAs('news/'.$article->id, Str::uuid().'.'.$data['image']->extension(), 'public');
        $oldPath = $article->cover_image_path;
        $article->update(['cover_image_path' => $path] + (array_key_exists('cover_image_alt', $data) ? ['cover_image_alt' => $data['cover_image_alt']] : []));
        if ($oldPath && ! str_starts_with($oldPath, '/') && ! preg_match('/^https?:\/\//', $oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        return $this->success($article->fresh(), 'Tải ảnh bìa thành công.', 201);
    }

    public function deleteCover(NewsArticle $article)
    {
        $this->removeCoverFile($article);
        $article->update(['cover_image_path' => null]);

        return $this->success($article->fresh(), 'Đã xóa ảnh bìa.');
    }

    private function removeCoverFile(NewsArticle $article): void
    {
        if ($article->cover_image_path && ! str_starts_with($article->cover_image_path, '/') && ! preg_match('/^https?:\/\//', $article->cover_image_path)) {
            Storage::disk('public')->delete($article->cover_image_path);
        }
    }

    private function prepareData(array $data): array
    {
        foreach (['excerpt', 'content', 'seo_title', 'seo_description', 'title', 'category'] as $field) {
            if (array_key_exists($field, $data) && is_string($data[$field])) {
                $data[$field] = trim(strip_tags($data[$field])) ?: null;
            }
        }
        if (($data['status'] ?? null) === 'published' && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        return $data;
    }

    private function guardPublishable(NewsArticle $article): void
    {
        if ($article->status === 'published' && (! $article->title || ! $article->slug || ! $article->content)) {
            throw ValidationException::withMessages(['content' => ['Bài viết cần đủ tiêu đề, slug và nội dung trước khi xuất bản.']]);
        }
    }
}
