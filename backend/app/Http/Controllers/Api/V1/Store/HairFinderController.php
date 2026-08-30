<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Services\HairFinderService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class HairFinderController extends Controller
{
    use ApiResponse;

    public function __construct(private HairFinderService $service) {}

    public function options()
    {
        return $this->success($this->service->options());
    }

    public function recommend(Request $request)
    {
        $data = $request->validate($this->service->validationRules());

        return $this->success($this->service->recommend($data));
    }
}
