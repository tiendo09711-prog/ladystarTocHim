<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminGlobalSearchService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class AdminGlobalSearchController extends Controller
{
    use ApiResponse;

    public function __invoke(Request $request, AdminGlobalSearchService $search)
    {
        $data = $request->validate(['q' => ['required', 'string', 'min:2', 'max:100']]);

        return $this->success($search->search($request->user(), trim($data['q'])));
    }
}
