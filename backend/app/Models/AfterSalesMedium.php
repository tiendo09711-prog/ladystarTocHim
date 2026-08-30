<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class AfterSalesMedium extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    public function urlFor(Request $request): string
    {
        if (Str::startsWith($request->path(), 'api/v1/admin/')) {
            return route('admin.after-sales-media.show', $this);
        }

        if (Str::startsWith($request->path(), 'api/v1/account/')) {
            return route('account.after-sales-media.show', $this);
        }

        return URL::temporarySignedRoute('guest.after-sales-media.show', now()->addMinutes(5), ['medium' => $this->id]);
    }

    public function mediable()
    {
        return $this->morphTo();
    }
}
