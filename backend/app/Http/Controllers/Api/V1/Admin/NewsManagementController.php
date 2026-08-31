<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\NewsArticleRequest;
use App\Models\NewsArticle;
use App\Models\Product;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class NewsManagementController extends Controller
{
    use ApiResponse;

    public function promotionProductOptions()
    {
        $products = Product::where('status', 'active')
            ->with(['images' => fn ($query) => $query->orderByDesc('is_primary')->orderBy('sort_order')])
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'base_sku'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'base_sku' => $product->base_sku,
                'image_path' => $product->images->first()?->image_path,
            ]);

        return $this->success($products);
    }

    public function index(Request $request)
    {
        $query = NewsArticle::with('author:id,name')->orderByDesc('created_at');
        $type = $this->routeType($request);
        $query->ofType($type);
        if ($type === NewsArticle::TYPE_PROMOTION) $query->withCount('products');
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($type === NewsArticle::TYPE_NEWS && $request->filled('category')) {
            $query->where('category', $request->input('category'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(fn ($q) => $q->where('title', 'like', '%'.$search.'%')->orWhere('slug', 'like', '%'.$search.'%'));
        }

        return $this->success($query->paginate(15));
    }

    public function show(Request $request, NewsArticle $article)
    {
        $this->guardRouteArticle($request, $article);
        return $this->success($article->load('author:id,name', 'products:id,name,slug,base_sku'));
    }

    public function store(NewsArticleRequest $request)
    {
        $article = DB::transaction(function () use ($request) {
            $data = $this->prepareData($request->validated());
            $type = $this->routeType($request);
            $data['content_type'] = $type;
            $this->removeDuplicateTypeCategory($data, $type);
            $productIds = $data['product_ids'] ?? [];
            unset($data['product_ids']);
            $article = NewsArticle::create($data + ['author_id' => $request->user()->id]);
            if ($type === NewsArticle::TYPE_PROMOTION) $article->products()->sync($productIds);
            $this->guardPublishable($article);

            return $article;
        });

        return $this->success($article->fresh()->load('products:id,name,slug,base_sku'), 'Đã tạo bản tin.', 201);
    }

    public function update(NewsArticleRequest $request, NewsArticle $article)
    {
        $this->guardRouteArticle($request, $article);
        DB::transaction(function () use ($request, $article) {
            $data = $this->prepareData($request->validated());
            $type = $this->routeType($request);
            $data['content_type'] = $type;
            $this->removeDuplicateTypeCategory($data, $type);
            $productIds = $data['product_ids'] ?? [];
            unset($data['product_ids']);
            $article->update($data);
            if ($type === NewsArticle::TYPE_PROMOTION) $article->products()->sync($productIds);
            $this->guardPublishable($article->fresh());
        });

        return $this->success($article->fresh()->load('products:id,name,slug,base_sku'), 'Đã lưu bản tin.');
    }

    public function destroy(Request $request, NewsArticle $article)
    {
        $this->guardRouteArticle($request, $article);
        $this->removeStoredFile($article->cover_image_path);
        $this->removeStoredFile($article->content_image_path);
        $this->removeStoredFile($article->video_path);
        $article->delete();

        return $this->success(null, 'Đã xóa bản tin.');
    }

    public function status(Request $request, NewsArticle $article)
    {
        $this->guardRouteArticle($request, $article);
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
        $this->guardRouteArticle($request, $article);
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

    public function deleteCover(Request $request, NewsArticle $article)
    {
        $this->guardRouteArticle($request, $article);
        $this->removeStoredFile($article->cover_image_path);
        $article->update(['cover_image_path' => null]);

        return $this->success($article->fresh(), 'Đã xóa ảnh bìa.');
    }

    public function uploadContentImage(Request $request, NewsArticle $article)
    {
        $this->guardGuideRoute($request, $article);
        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'content_image_alt' => ['nullable', 'string', 'max:190'],
        ]);
        $path = $data['image']->storePubliclyAs('guides/'.$article->id.'/content', Str::uuid().'.'.$data['image']->extension(), 'public');
        $this->removeStoredFile($article->content_image_path);
        $article->update(['content_image_path' => $path] + (array_key_exists('content_image_alt', $data) ? ['content_image_alt' => $data['content_image_alt']] : []));

        return $this->success($article->fresh(), 'Tải ảnh nội dung thành công.', 201);
    }

    public function deleteContentImage(Request $request, NewsArticle $article)
    {
        $this->guardGuideRoute($request, $article);
        $this->removeStoredFile($article->content_image_path);
        $article->update(['content_image_path' => null]);

        return $this->success($article->fresh(), 'Đã xóa ảnh nội dung.');
    }

    public function uploadVideo(Request $request, NewsArticle $article)
    {
        $this->guardGuideRoute($request, $article);
        $data = $request->validate(['video' => ['required', 'file', 'mimes:mp4,webm', 'max:51200']]);
        $path = $data['video']->storePubliclyAs('guides/'.$article->id.'/video', Str::uuid().'.'.$data['video']->extension(), 'public');
        $this->removeStoredFile($article->video_path);
        $article->update(['video_path' => $path]);

        return $this->success($article->fresh(), 'Tải video hướng dẫn thành công.', 201);
    }

    public function deleteVideo(Request $request, NewsArticle $article)
    {
        $this->guardGuideRoute($request, $article);
        $this->removeStoredFile($article->video_path);
        $article->update(['video_path' => null]);

        return $this->success($article->fresh(), 'Đã xóa video hướng dẫn.');
    }

    private function removeStoredFile(?string $path): void
    {
        if ($path && ! str_starts_with($path, '/') && ! preg_match('/^https?:\/\//', $path)) Storage::disk('public')->delete($path);
    }

    private function prepareData(array $data): array
    {
        foreach (['excerpt', 'content', 'seo_title', 'seo_description', 'title', 'category', 'promotion_badge', 'promotion_conditions', 'content_image_alt', 'video_url', 'video_title'] as $field) {
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
        if ($article->status === 'published' && $article->content_type === NewsArticle::TYPE_PROMOTION) {
            if (! $article->promotion_conditions) {
                throw ValidationException::withMessages(['promotion_conditions' => ['Ưu đãi cần có điều kiện áp dụng trước khi xuất bản.']]);
            }
            if (! $article->products()->where('status', 'active')->exists()) {
                throw ValidationException::withMessages(['product_ids' => ['Ưu đãi cần áp dụng cho ít nhất một sản phẩm đang hoạt động.']]);
            }
        }
    }

    private function routeType(Request $request): string
    {
        if ($request->is('api/v1/admin/promotions*')) return NewsArticle::TYPE_PROMOTION;
        if ($request->is('api/v1/admin/guides*')) return NewsArticle::TYPE_GUIDE;

        return NewsArticle::TYPE_NEWS;
    }

    private function removeDuplicateTypeCategory(array &$data, string $type): void
    {
        if (in_array($type, [NewsArticle::TYPE_PROMOTION, NewsArticle::TYPE_GUIDE], true)) $data['category'] = null;
    }

    private function guardRouteArticle(Request $request, NewsArticle $article): void
    {
        abort_unless($article->content_type === $this->routeType($request), 404);
    }

    private function guardGuideRoute(Request $request, NewsArticle $article): void
    {
        abort_unless($request->is('api/v1/admin/guides*') && $article->content_type === NewsArticle::TYPE_GUIDE, 404);
    }
}
