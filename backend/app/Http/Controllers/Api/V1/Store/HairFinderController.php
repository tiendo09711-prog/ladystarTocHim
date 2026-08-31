<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Services\HairFinderService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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
        if (! $this->service->isConfigured()) {
            throw ValidationException::withMessages(['hair_finder' => 'Hair Finder chưa được cấu hình.']);
        }

        $data = $request->validate($this->service->validationRules());

        return $this->success($this->service->recommend($data));
    }
}
