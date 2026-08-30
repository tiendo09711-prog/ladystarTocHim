<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AfterSalesMedium;
use App\Models\ReturnRequest;
use App\Models\WarrantyRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AfterSalesMediaController extends Controller
{
    public function show(Request $request, AfterSalesMedium $medium)
    {
        $permission = match ($medium->mediable_type) {
            ReturnRequest::class => 'returns.view',
            WarrantyRequest::class => 'warranties.view',
            default => null,
        };
        abort_unless($permission && $request->user()->hasPermission($permission), 403);
        $disk = $medium->disk ?: 'public';
        abort_unless(Storage::disk($disk)->exists($medium->path), 404);

        return Storage::disk($disk)->response($medium->path, $medium->original_name, [
            'Content-Type' => $medium->mime_type,
            'Content-Disposition' => 'inline; filename="'.basename($medium->original_name).'"',
        ]);
    }
}
