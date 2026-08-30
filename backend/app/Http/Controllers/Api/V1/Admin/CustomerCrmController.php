<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomerNote;
use App\Models\CustomerTag;
use App\Models\User;
use App\Services\AuditLogService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CustomerCrmController extends Controller
{
    use ApiResponse;

    public function __construct(private AuditLogService $audit) {}

    public function tags()
    {
        return $this->success(CustomerTag::withCount('customers')->orderBy('name')->get());
    }

    public function storeTag(Request $request)
    {
        $name = trim($request->validate(['name' => ['required', 'string', 'max:80']])['name']);
        if (CustomerTag::whereRaw('LOWER(name) = ?', [Str::lower($name)])->exists()) {
            throw ValidationException::withMessages(['name' => 'Tên thẻ đã tồn tại.']);
        }

        return $this->success(CustomerTag::create(['name' => $name]), 'Đã tạo thẻ khách hàng.', 201);
    }

    public function deleteTag(CustomerTag $tag)
    {
        $before = $tag->toArray();
        $tag->delete();
        $this->audit->record('customer_tag.deleted', 'customers', 'CustomerTag', $before);

        return $this->success(null, 'Đã xóa thẻ khách hàng.');
    }

    public function attachTag(Request $request, User $user)
    {
        $this->assertCustomer($user);
        $tag = CustomerTag::findOrFail($request->validate(['tag_id' => ['required', 'integer', 'exists:customer_tags,id']])['tag_id']);
        $attached = ! $user->customerTags()->whereKey($tag->id)->exists();
        if ($attached) $user->customerTags()->attach($tag->id);
        if ($attached) $this->audit->record('customer.tag_added', 'customers', $user, null, ['tag_id' => $tag->id, 'tag_name' => $tag->name]);

        return $this->success($user->customerTags()->orderBy('name')->get(), $attached ? 'Đã gắn thẻ khách hàng.' : 'Thẻ đã được gắn trước đó.');
    }

    public function detachTag(User $user, CustomerTag $tag)
    {
        $this->assertCustomer($user);
        $user->customerTags()->detach($tag->id);
        $this->audit->record('customer.tag_removed', 'customers', $user, ['tag_id' => $tag->id, 'tag_name' => $tag->name]);

        return $this->success($user->customerTags()->orderBy('name')->get(), 'Đã gỡ thẻ khách hàng.');
    }

    public function storeNote(Request $request, User $user)
    {
        $this->assertCustomer($user);
        $content = trim($request->validate(['content' => ['required', 'string', 'max:5000']])['content']);
        $note = $user->customerNotes()->create(['staff_id' => $request->user()->id, 'content' => $content]);
        $this->audit->record('customer_note.created', 'customers', $note, null, ['customer_id' => $user->id]);

        return $this->success($note->load('staff:id,name'), 'Đã thêm ghi chú nội bộ.', 201);
    }

    public function updateNote(Request $request, User $user, CustomerNote $note)
    {
        $this->assertCustomer($user);
        abort_unless($note->customer_id === $user->id, 404);
        $before = $note->toArray();
        $note->update(['content' => trim($request->validate(['content' => ['required', 'string', 'max:5000']])['content'])]);
        $this->audit->record('customer_note.updated', 'customers', $note, $before, $note->toArray());

        return $this->success($note->load('staff:id,name'), 'Đã cập nhật ghi chú nội bộ.');
    }

    public function deleteNote(User $user, CustomerNote $note)
    {
        $this->assertCustomer($user);
        abort_unless($note->customer_id === $user->id, 404);
        $before = $note->toArray();
        $note->delete();
        $this->audit->record('customer_note.deleted', 'customers', 'CustomerNote', $before);

        return $this->success(null, 'Đã xóa ghi chú nội bộ.');
    }

    private function assertCustomer(User $user): void
    {
        abort_unless($user->isCustomer(), 404);
    }
}
