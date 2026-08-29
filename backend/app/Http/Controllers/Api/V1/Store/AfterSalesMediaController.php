<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\AfterSalesMedium;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AfterSalesMediaController extends Controller
{
    public function account(Request $request, AfterSalesMedium $medium)
    {
        $medium->load('mediable.order');
        $ownerId = $medium->mediable?->user_id ?? $medium->mediable?->order?->user_id;
        abort_unless((int) $ownerId === (int) $request->user()->id, 404);

        return $this->serve($medium);
    }

    public function guest(AfterSalesMedium $medium)
    {
        return $this->serve($medium);
    }

    private function serve(AfterSalesMedium $medium)
    {
        $disk = $medium->disk ?: 'public';
        abort_unless(Storage::disk($disk)->exists($medium->path), 404);

        return Storage::disk($disk)->response($medium->path, $medium->original_name, [
            'Content-Type' => $medium->mime_type,
            'Content-Disposition' => 'inline; filename="'.basename($medium->original_name).'"',
        ]);
    }
}
