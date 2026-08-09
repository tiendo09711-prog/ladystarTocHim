<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\HomePageContent;
use App\Support\ApiResponse;

class HomePageController extends Controller
{
    use ApiResponse;

    public function show()
    {
        return $this->success(HomePageContent::current());
    }
}
