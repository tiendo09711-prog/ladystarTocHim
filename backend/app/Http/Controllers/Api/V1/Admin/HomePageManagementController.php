<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\HomePageContentRequest;
use App\Models\HomePageContent;
use App\Support\ApiResponse;

class HomePageManagementController extends Controller
{
    use ApiResponse;

    public function show()
    {
        return $this->success(HomePageContent::current());
    }

    public function update(HomePageContentRequest $request)
    {
        $content = HomePageContent::current();
        $content->update($request->validated());

        return $this->success($content->refresh(), 'Đã lưu nội dung trang chủ.');
    }
}
