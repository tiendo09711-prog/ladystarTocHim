import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AccountLayout } from '../layouts/AccountLayout'
import { StoreLayout } from '../layouts/StoreLayout'
import { AccountIndexPage, AddressesPage, OrderDetailPage, OrdersPage, ProfilePage, WishlistPage } from '../pages/account/AccountPages'
import { NotFoundPage } from '../pages/NotFoundPage'
import { CartPage } from '../pages/store/CartPage'
import { CheckoutPage } from '../pages/store/CheckoutPage'
import { ContentPage, OrderSuccessPage } from '../pages/store/ContentPage'
import { AboutPage } from '../pages/store/AboutPage'
import { NewsDetailPage } from '../pages/store/NewsDetailPage'
import { NewsPage } from '../pages/store/NewsPage'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from '../pages/store/AuthPages'
import { HomePage } from '../pages/store/HomePage'
import { GuidePage } from '../pages/store/GuidePage'
import { ProductPage } from '../pages/store/ProductPage'
import { ProductsPage } from '../pages/store/ProductsPage'
import { PromotionsPage } from '../pages/store/PromotionsPage'
import { AdminProtectedRoute } from './AdminProtectedRoute'
import { UserProtectedRoute } from './UserProtectedRoute'

const DashboardPage = lazy(() => import('../pages/admin/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const AdminLayout = lazy(() => import('../layouts/AdminLayout').then((module) => ({ default: module.AdminLayout })))
const ProductsAdminPage = lazy(() => import('../pages/admin/ProductsAdminPage').then((module) => ({ default: module.ProductsAdminPage })))
const ProductFormPage = lazy(() => import('../pages/admin/ProductFormPage').then((module) => ({ default: module.ProductFormPage })))
const CategoriesAdminPage = lazy(() => import('../pages/admin/CategoriesAdminPage').then((module) => ({ default: module.CategoriesAdminPage })))
const InventoryAdminPage = lazy(() => import('../pages/admin/InventoryAdminPage').then((module) => ({ default: module.InventoryAdminPage })))
const OrdersAdminPage = lazy(() => import('../pages/admin/OrdersAdminPage').then((module) => ({ default: module.OrdersAdminPage })))
const AdminOrderDetailPage = lazy(() => import('../pages/admin/OrdersAdminPage').then((module) => ({ default: module.AdminOrderDetailPage })))
const AttributesAdminPage = lazy(() => import('../pages/admin/AttributesAdminPage').then((module) => ({ default: module.AttributesAdminPage })))
const BranchesAdminPage = lazy(() => import('../pages/admin/BranchesAdminPage').then((module) => ({ default: module.BranchesAdminPage })))
const CustomersAdminPage = lazy(() => import('../pages/admin/CustomersAdminPage').then((module) => ({ default: module.CustomersAdminPage })))
const ReviewsAdminPage = lazy(() => import('../pages/admin/ReviewsAdminPage').then((module) => ({ default: module.ReviewsAdminPage })))
const CouponsAdminPage = lazy(() => import('../pages/admin/CouponsAdminPage').then((module) => ({ default: module.CouponsAdminPage })))
const InventoryTransactionsPage = lazy(() => import('../pages/admin/InventoryTransactionsPage').then((module) => ({ default: module.InventoryTransactionsPage })))
const ImportExportPage = lazy(() => import('../pages/admin/ImportExportPage').then((module) => ({ default: module.ImportExportPage })))
const BarcodesPage = lazy(() => import('../pages/admin/BarcodesPage').then((module) => ({ default: module.BarcodesPage })))
const SettingsAdminPage = lazy(() => import('../pages/admin/SettingsAdminPage').then((module) => ({ default: module.SettingsAdminPage })))
const AboutAdminPage = lazy(() => import('../pages/admin/AboutAdminPage').then((module) => ({ default: module.AboutAdminPage })))
const CatalogContentAdminPage = lazy(() => import('../pages/admin/CatalogContentAdminPage').then((module) => ({ default: module.CatalogContentAdminPage })))
const ConsultationRequestsAdminPage = lazy(() => import('../pages/admin/ConsultationRequestsAdminPage').then((module) => ({ default: module.ConsultationRequestsAdminPage })))
const NewsAdminPage = lazy(() => import('../pages/admin/NewsAdminPage').then((module) => ({ default: module.NewsAdminPage })))
const NewsFormPage = lazy(() => import('../pages/admin/NewsFormPage').then((module) => ({ default: module.NewsFormPage })))
const NewsPageSettingsAdminPage = lazy(() => import('../pages/admin/NewsPageSettingsAdminPage').then((module) => ({ default: module.NewsPageSettingsAdminPage })))
const PromotionsAdminPage = lazy(() => import('../pages/admin/PromotionsAdminPage').then((module) => ({ default: module.PromotionsAdminPage })))
const PromotionFormPage = lazy(() => import('../pages/admin/PromotionFormPage').then((module) => ({ default: module.PromotionFormPage })))
const PromotionsPageSettingsAdminPage = lazy(() => import('../pages/admin/PromotionsPageSettingsAdminPage').then((module) => ({ default: module.PromotionsPageSettingsAdminPage })))
const HairGuidePage = lazy(() => import('../pages/store/HairGuidePage').then((module) => ({ default: module.HairGuidePage })))

const lazyPage = (page: ReactNode) => <Suspense fallback={<div className="card p-8 text-center">Đang tải màn hình...</div>}>{page}</Suspense>

export const router = createBrowserRouter([
  { path: '/admin/login', element: <LoginPage admin /> },
  { element: <AdminProtectedRoute />, children: [{ path: '/admin', element: lazyPage(<AdminLayout />), children: [
    { index: true, element: <Navigate to="dashboard" replace /> }, { path: 'dashboard', element: lazyPage(<DashboardPage />) },
    { path: 'products', element: lazyPage(<ProductsAdminPage />) }, { path: 'products/create', element: lazyPage(<ProductFormPage />) }, { path: 'products/:id/edit', element: lazyPage(<ProductFormPage />) },
    { path: 'categories', element: lazyPage(<CategoriesAdminPage />) }, { path: 'attributes', element: lazyPage(<AttributesAdminPage />) },
    { path: 'branches', element: lazyPage(<BranchesAdminPage />) },
    { path: 'inventory', element: lazyPage(<InventoryAdminPage />) }, { path: 'inventory/transactions', element: lazyPage(<InventoryTransactionsPage />) },
    { path: 'orders', element: lazyPage(<OrdersAdminPage />) }, { path: 'orders/:id', element: lazyPage(<AdminOrderDetailPage />) },
    { path: 'customers', element: lazyPage(<CustomersAdminPage />) },
    { path: 'reviews', element: lazyPage(<ReviewsAdminPage />) },
    { path: 'coupons', element: lazyPage(<CouponsAdminPage />) },
    { path: 'import-export', element: lazyPage(<ImportExportPage />) }, { path: 'barcodes', element: lazyPage(<BarcodesPage />) },
    { path: 'reports', element: lazyPage(<DashboardPage />) }, { path: 'settings', element: lazyPage(<SettingsAdminPage />) },
    { path: 'about', element: lazyPage(<AboutAdminPage />) },
    { path: 'catalog-content', element: lazyPage(<CatalogContentAdminPage />) }, { path: 'consultation-requests', element: lazyPage(<ConsultationRequestsAdminPage />) },
    { path: 'news', element: lazyPage(<NewsAdminPage />) }, { path: 'news/create', element: lazyPage(<NewsFormPage />) }, { path: 'news/:id/edit', element: lazyPage(<NewsFormPage />) }, { path: 'news/settings', element: lazyPage(<NewsPageSettingsAdminPage />) },
    { path: 'promotions', element: lazyPage(<PromotionsAdminPage />) }, { path: 'promotions/create', element: lazyPage(<PromotionFormPage />) }, { path: 'promotions/:id/edit', element: lazyPage(<PromotionFormPage />) }, { path: 'promotions/settings', element: lazyPage(<PromotionsPageSettingsAdminPage />) },
  ] }] },
  { path: '/', element: <StoreLayout />, children: [
    { index: true, element: <HomePage /> }, { path: 'san-pham', element: <ProductsPage /> }, { path: 'san-pham/:slug', element: <ProductPage /> },
    { path: 'danh-muc/:slug', element: <ProductsPage /> }, { path: 'tim-kiem', element: <ProductsPage /> }, { path: 'gio-hang', element: <CartPage /> },
    { path: 'dang-nhap', element: <LoginPage /> }, { path: 'dang-ky', element: <RegisterPage /> }, { path: 'quen-mat-khau', element: <ForgotPasswordPage /> }, { path: 'dat-lai-mat-khau', element: <ResetPasswordPage /> },
    { path: 'gioi-thieu', element: <AboutPage /> },
    { path: 'tin-tuc', element: <NewsPage /> }, { path: 'tin-tuc/:slug', element: <NewsDetailPage /> }, { path: 'uu-dai', element: <PromotionsPage /> }, { path: 'huong-dan', element: <GuidePage /> }, { path: 'lien-he', element: <ContentPage page="lien-he" /> }, { path: 'dich-vu-cham-soc', element: lazyPage(<HairGuidePage />) }, { path: 'huong-dan-chon-toc', element: <Navigate to="/dich-vu-cham-soc" replace /> },
    { path: 'chinh-sach-giao-hang', element: <ContentPage page="chinh-sach-giao-hang" /> }, { path: 'chinh-sach-doi-tra', element: <ContentPage page="chinh-sach-doi-tra" /> }, { path: 'chinh-sach-bao-mat', element: <ContentPage page="chinh-sach-bao-mat" /> },
    { element: <UserProtectedRoute />, children: [{ path: 'thanh-toan', element: <CheckoutPage /> }, { path: 'dat-hang-thanh-cong/:orderNumber', element: <OrderSuccessPage /> }, { path: 'tai-khoan', element: <AccountLayout />, children: [
      { index: true, element: <AccountIndexPage /> }, { path: 'ho-so', element: <ProfilePage /> }, { path: 'dia-chi', element: <AddressesPage /> }, { path: 'don-hang', element: <OrdersPage /> }, { path: 'don-hang/:orderNumber', element: <OrderDetailPage /> }, { path: 'yeu-thich', element: <WishlistPage /> },
    ] }] },
    { path: '*', element: <NotFoundPage /> },
  ] },
])
