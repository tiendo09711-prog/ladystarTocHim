<?php

use App\Http\Controllers\Api\V1\Account\AccountController;
use App\Http\Controllers\Api\V1\Account\CartController;
use App\Http\Controllers\Api\V1\Account\CheckoutController;
use App\Http\Controllers\Api\V1\Account\OrderController;
use App\Http\Controllers\Api\V1\Admin\CatalogManagementController;
use App\Http\Controllers\Api\V1\Admin\DashboardController;
use App\Http\Controllers\Api\V1\Admin\OperationsController;
use App\Http\Controllers\Api\V1\Admin\ProductManagementController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Store\CatalogController;
use App\Http\Controllers\Api\V1\Store\ProductController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
        Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('reset-password', [AuthController::class, 'resetPassword']);
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('me', [AuthController::class, 'me']);
            Route::post('logout', [AuthController::class, 'logout']);
        });
    });

    Route::get('categories', [CatalogController::class, 'categories']);
    Route::get('categories/{slug}', [CatalogController::class, 'category']);
    Route::get('brands', [CatalogController::class, 'brands']);
    Route::get('attributes', [CatalogController::class, 'attributes']);
    Route::get('products/featured', [ProductController::class, 'featured']);
    Route::get('products/new', [ProductController::class, 'newest']);
    Route::get('products/sale', [ProductController::class, 'sale']);
    Route::get('products', [ProductController::class, 'index']);
    Route::get('products/{slug}', [ProductController::class, 'show']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('account/profile', [AccountController::class, 'profile']);
        Route::put('account/profile', [AccountController::class, 'updateProfile']);
        Route::put('account/password', [AccountController::class, 'updatePassword']);
        Route::get('account/addresses', [AccountController::class, 'addresses']);
        Route::post('account/addresses', [AccountController::class, 'storeAddress']);
        Route::put('account/addresses/{id}', [AccountController::class, 'updateAddress']);
        Route::delete('account/addresses/{id}', [AccountController::class, 'deleteAddress']);
        Route::patch('account/addresses/{id}/default', [AccountController::class, 'defaultAddress']);
        Route::get('cart', [CartController::class, 'index']);
        Route::post('cart/items', [CartController::class, 'store']);
        Route::patch('cart/items/{id}', [CartController::class, 'update']);
        Route::delete('cart/items/{id}', [CartController::class, 'destroy']);
        Route::delete('cart', [CartController::class, 'clear']);
        Route::post('checkout/preview', [CheckoutController::class, 'preview']);
        Route::post('checkout/place-order', [CheckoutController::class, 'place']);
        Route::get('account/orders', [OrderController::class, 'index']);
        Route::get('account/orders/{orderNumber}', [OrderController::class, 'show']);
        Route::post('account/orders/{orderNumber}/cancel', [OrderController::class, 'cancel']);
        Route::get('account/wishlist', [AccountController::class, 'wishlist']);
        Route::post('account/wishlist/{product}', [AccountController::class, 'addWishlist']);
        Route::delete('account/wishlist/{product}', [AccountController::class, 'removeWishlist']);
        Route::post('account/reviews', [AccountController::class, 'storeReview']);
        Route::put('account/reviews/{id}', [AccountController::class, 'updateReview']);
        Route::delete('account/reviews/{id}', [AccountController::class, 'deleteReview']);
    });

    Route::prefix('admin')->group(function () {
        Route::post('auth/login', [AuthController::class, 'adminLogin']);
        Route::middleware(['auth:sanctum', 'admin'])->group(function () {
            Route::post('auth/logout', [AuthController::class, 'logout']);
            Route::get('auth/me', [AuthController::class, 'me']);
            Route::get('dashboard/summary', [DashboardController::class, 'summary']);
            Route::get('dashboard/revenue', [DashboardController::class, 'revenue']);
            Route::get('dashboard/order-statuses', [DashboardController::class, 'orderStatuses']);
            Route::get('dashboard/top-products', [DashboardController::class, 'topProducts']);
            Route::get('dashboard/low-stock', [DashboardController::class, 'lowStock']);

            Route::get('categories', [CatalogManagementController::class, 'categories']);
            Route::post('categories', [CatalogManagementController::class, 'storeCategory']);
            Route::patch('categories/reorder', [CatalogManagementController::class, 'reorderCategories']);
            Route::get('categories/{category}', [CatalogManagementController::class, 'showCategory']);
            Route::put('categories/{category}', [CatalogManagementController::class, 'updateCategory']);
            Route::delete('categories/{category}', [CatalogManagementController::class, 'deleteCategory']);
            Route::patch('categories/{category}/status', [CatalogManagementController::class, 'categoryStatus']);

            Route::get('products', [ProductManagementController::class, 'index']);
            Route::post('products', [ProductManagementController::class, 'store']);
            Route::get('products/{product}', [ProductManagementController::class, 'show']);
            Route::put('products/{product}', [ProductManagementController::class, 'update']);
            Route::delete('products/{product}', [ProductManagementController::class, 'destroy']);
            Route::patch('products/{product}/status', [ProductManagementController::class, 'status']);
            Route::post('products/{product}/images', [ProductManagementController::class, 'uploadImages']);
            Route::delete('products/{product}/images/{image}', [ProductManagementController::class, 'deleteImage']);
            Route::patch('products/{product}/images/{image}/primary', [ProductManagementController::class, 'primaryImage']);
            Route::post('products/{product}/variants', [ProductManagementController::class, 'storeVariant']);
            Route::put('products/{product}/variants/{variant}', [ProductManagementController::class, 'updateVariant']);
            Route::delete('products/{product}/variants/{variant}', [ProductManagementController::class, 'deleteVariant']);

            Route::get('attributes', [CatalogManagementController::class, 'attributes']);
            Route::post('attributes', [CatalogManagementController::class, 'storeAttribute']);
            Route::put('attributes/{attribute}', [CatalogManagementController::class, 'updateAttribute']);
            Route::delete('attributes/{attribute}', [CatalogManagementController::class, 'deleteAttribute']);
            Route::post('attributes/{attribute}/values', [CatalogManagementController::class, 'storeAttributeValue']);
            Route::put('attributes/{attribute}/values/{value}', [CatalogManagementController::class, 'updateAttributeValue']);
            Route::delete('attributes/{attribute}/values/{value}', [CatalogManagementController::class, 'deleteAttributeValue']);
            Route::get('branches', [CatalogManagementController::class, 'branches']);
            Route::post('branches', [CatalogManagementController::class, 'storeBranch']);
            Route::put('branches/{branch}', [CatalogManagementController::class, 'updateBranch']);
            Route::delete('branches/{branch}', [CatalogManagementController::class, 'deleteBranch']);

            Route::get('inventory', [OperationsController::class, 'inventory']);
            Route::get('inventory/transactions', [OperationsController::class, 'transactions']);
            Route::post('inventory/import', [OperationsController::class, 'adjustInventory']);
            Route::post('inventory/adjust', [OperationsController::class, 'adjustInventory']);
            Route::post('inventory/transfer', [OperationsController::class, 'transferInventory']);
            Route::get('inventory/low-stock', [OperationsController::class, 'lowStock']);
            Route::get('orders', [OperationsController::class, 'orders']);
            Route::get('orders/{order}', [OperationsController::class, 'showOrder']);
            Route::patch('orders/{order}/status', [OperationsController::class, 'orderStatus']);
            Route::patch('orders/{order}/payment-status', [OperationsController::class, 'paymentStatus']);
            Route::post('orders/{order}/cancel', [OperationsController::class, 'cancelOrder']);
            Route::post('orders/{order}/notes', [OperationsController::class, 'notes']);
            Route::get('customers', [OperationsController::class, 'customers']);
            Route::get('customers/{user}', [OperationsController::class, 'showCustomer']);
            Route::patch('customers/{user}/status', [OperationsController::class, 'customerStatus']);
            Route::get('reviews', [OperationsController::class, 'reviews']);
            Route::patch('reviews/{review}/status', [OperationsController::class, 'reviewStatus']);
            Route::delete('reviews/{review}', [OperationsController::class, 'deleteReview']);
            Route::get('coupons', [OperationsController::class, 'coupons']);
            Route::post('coupons', [OperationsController::class, 'storeCoupon']);
            Route::put('coupons/{coupon}', [OperationsController::class, 'updateCoupon']);
            Route::delete('coupons/{coupon}', [OperationsController::class, 'deleteCoupon']);
            Route::post('import/products', [OperationsController::class, 'importProducts']);
            Route::get('export/{resource}', [OperationsController::class, 'export']);
            Route::get('barcodes', [OperationsController::class, 'barcodes']);
            Route::post('barcodes/{variant}/generate', [OperationsController::class, 'generateBarcode']);
            Route::get('settings', [OperationsController::class, 'settings']);
            Route::put('settings', [OperationsController::class, 'updateSettings']);
        });
    });
});
