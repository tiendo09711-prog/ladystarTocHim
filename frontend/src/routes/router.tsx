import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AccountLayout } from '../layouts/AccountLayout'
import { StoreLayout } from '../layouts/StoreLayout'
import { AccountIndexPage, OrdersPage, ProfilePage } from '../pages/account/AccountPages'
import { AddressesPage } from '../pages/account/AddressesPage'
import { OrderDetailPage } from '../pages/account/OrderDetailPage'
import { ReturnsPage, WarrantiesPage } from '../pages/account/AfterSalesPages'
import { AppointmentsPage } from '../pages/account/AppointmentsPage'
import { SecurityPage } from '../pages/account/SecurityPage'
import { WishlistPage } from '../pages/account/WishlistPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { CartPage } from '../pages/store/CartPage'
import { CheckoutPage } from '../pages/store/CheckoutPage'
import { ContentPage, OrderSuccessPage } from '../pages/store/ContentPage'
import { OrderTrackingPage } from '../pages/store/OrderTrackingPage'
import { AboutPage } from '../pages/store/AboutPage'
import { NewsDetailPage } from '../pages/store/NewsDetailPage'
import { PromotionDetailPage } from '../pages/store/PromotionDetailPage'
import { NewsPage } from '../pages/store/NewsPage'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from '../pages/store/AuthPages'
import { HomePage } from '../pages/store/HomePage'
import { GuidePage } from '../pages/store/GuidePage'
import { GuideDetailPage } from '../pages/store/GuideDetailPage'
import { ProductPage } from '../pages/store/ProductPage'
import { ProductsPage } from '../pages/store/ProductsPage'
import { ComparePage } from '../pages/store/ComparePage'
import { HairFinderPage } from '../pages/store/HairFinderPage'
import { PromotionsPage } from '../pages/store/PromotionsPage'
import { StoreLocationsPage } from '../pages/store/StoreLocationsPage'
import { ContactPage } from '../pages/store/ContactPage'
import { AppointmentPage } from '../pages/store/AppointmentPage'
import { AdminProtectedRoute } from './AdminProtectedRoute'
import { UserProtectedRoute } from './UserProtectedRoute'
import { AdminIndexRedirect } from './AdminIndexRedirect'
import { AdminForbiddenPage } from '../pages/admin/AdminForbiddenPage'

const DashboardPage = lazy(() => import('../pages/admin/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ReportsPage = lazy(() => import('../pages/admin/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const AdminLayout = lazy(() => import('../layouts/AdminLayout').then((module) => ({ default: module.AdminLayout })))
const ProductsAdminPage = lazy(() => import('../pages/admin/ProductsAdminPage').then((module) => ({ default: module.ProductsAdminPage })))
const ProductFormPage = lazy(() => import('../pages/admin/ProductFormPage').then((module) => ({ default: module.ProductFormPage })))
const CategoriesAdminPage = lazy(() => import('../pages/admin/CategoriesAdminPage').then((module) => ({ default: module.CategoriesAdminPage })))
const BrandsAdminPage = lazy(() => import('../pages/admin/BrandsAdminPage').then((module) => ({ default: module.BrandsAdminPage })))
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
const PolicyPagesAdminPage = lazy(() => import('../pages/admin/PolicyPagesAdminPage').then((module) => ({ default: module.PolicyPagesAdminPage })))
const AboutAdminPage = lazy(() => import('../pages/admin/AboutAdminPage').then((module) => ({ default: module.AboutAdminPage })))
const CatalogContentAdminPage = lazy(() => import('../pages/admin/CatalogContentAdminPage').then((module) => ({ default: module.CatalogContentAdminPage })))
const ConsultationRequestsAdminPage = lazy(() => import('../pages/admin/ConsultationRequestsAdminPage').then((module) => ({ default: module.ConsultationRequestsAdminPage })))
const ServicesAdminPage = lazy(() => import('../pages/admin/ServicesAdminPage').then((module) => ({ default: module.ServicesAdminPage })))
const NewsAdminPage = lazy(() => import('../pages/admin/NewsAdminPage').then((module) => ({ default: module.NewsAdminPage })))
const NewsFormPage = lazy(() => import('../pages/admin/NewsFormPage').then((module) => ({ default: module.NewsFormPage })))
const NewsPageSettingsAdminPage = lazy(() => import('../pages/admin/NewsPageSettingsAdminPage').then((module) => ({ default: module.NewsPageSettingsAdminPage })))
const PromotionsAdminPage = lazy(() => import('../pages/admin/PromotionsAdminPage').then((module) => ({ default: module.PromotionsAdminPage })))
const PromotionFormPage = lazy(() => import('../pages/admin/PromotionFormPage').then((module) => ({ default: module.PromotionFormPage })))
const PromotionsPageSettingsAdminPage = lazy(() => import('../pages/admin/PromotionsPageSettingsAdminPage').then((module) => ({ default: module.PromotionsPageSettingsAdminPage })))
const HomePageAdminPage = lazy(() => import('../pages/admin/HomePageAdminPage').then((module) => ({ default: module.HomePageAdminPage })))
const StorePageAdminPage = lazy(() => import('../pages/admin/StorePageAdminPage').then((module) => ({ default: module.StorePageAdminPage })))
const ContactPageAdminPage = lazy(() => import('../pages/admin/ContactPageAdminPage').then((module) => ({ default: module.ContactPageAdminPage })))
const GuidesAdminPage = lazy(() => import('../pages/admin/GuidesAdminPage').then((module) => ({ default: module.GuidesAdminPage })))
const GuideFormAdminPage = lazy(() => import('../pages/admin/GuideFormAdminPage').then((module) => ({ default: module.GuideFormAdminPage })))
const GuidesPageSettingsAdminPage = lazy(() => import('../pages/admin/GuidesPageSettingsAdminPage').then((module) => ({ default: module.GuidesPageSettingsAdminPage })))
const ReturnsAdminPage = lazy(() => import('../pages/admin/AfterSalesAdminPages').then((module) => ({ default: module.ReturnsAdminPage })))
const WarrantiesAdminPage = lazy(() => import('../pages/admin/AfterSalesAdminPages').then((module) => ({ default: module.WarrantiesAdminPage })))
const AppointmentsAdminPage = lazy(() => import('../pages/admin/AppointmentsAdminPage').then((module) => ({ default: module.AppointmentsAdminPage })))
const StaffManagementPage = lazy(() => import('../pages/admin/StaffManagementPage').then((module) => ({ default: module.StaffManagementPage })))
const StaffRolesPage = lazy(() => import('../pages/admin/StaffRolesPage').then((module) => ({ default: module.StaffRolesPage })))
const AuditLogsPage = lazy(() => import('../pages/admin/AuditLogsPage').then((module) => ({ default: module.AuditLogsPage })))
const HairGuidePage = lazy(() => import('../pages/store/HairGuidePage').then((module) => ({ default: module.HairGuidePage })))

const lazyPage = (page: ReactNode) => <Suspense fallback={<div className="card p-8 text-center">Đang tải màn hình...</div>}>{page}</Suspense>

export const router = createBrowserRouter([
  { path: '/admin/login', element: <LoginPage admin /> },
  { element: <AdminProtectedRoute />, children: [{ path: '/admin', element: lazyPage(<AdminLayout />), children: [
    { index: true, element: <AdminIndexRedirect /> }, { path: 'dashboard', element: lazyPage(<DashboardPage />) },
    { path: 'products', element: lazyPage(<ProductsAdminPage />) }, { path: 'products/create', element: lazyPage(<ProductFormPage />) }, { path: 'products/:id/edit', element: lazyPage(<ProductFormPage />) },
    { path: 'categories', element: lazyPage(<CategoriesAdminPage />) }, { path: 'brands', element: lazyPage(<BrandsAdminPage />) }, { path: 'attributes', element: lazyPage(<AttributesAdminPage />) },
    { path: 'branches', element: lazyPage(<BranchesAdminPage />) },
    { path: 'inventory', element: lazyPage(<InventoryAdminPage />) }, { path: 'inventory/transactions', element: lazyPage(<InventoryTransactionsPage />) },
    { path: 'orders', element: lazyPage(<OrdersAdminPage />) }, { path: 'orders/:id', element: lazyPage(<AdminOrderDetailPage />) },
    { path: 'returns', element: lazyPage(<ReturnsAdminPage />) }, { path: 'returns/:id', element: lazyPage(<ReturnsAdminPage />) },
    { path: 'warranties', element: lazyPage(<WarrantiesAdminPage />) }, { path: 'warranties/:id', element: lazyPage(<WarrantiesAdminPage />) },
    { path: 'appointments', element: lazyPage(<AppointmentsAdminPage />) },
    { path: 'customers', element: lazyPage(<CustomersAdminPage />) },
    { path: 'reviews', element: lazyPage(<ReviewsAdminPage />) },
    { path: 'coupons', element: lazyPage(<CouponsAdminPage />) },
    { path: 'import-export', element: lazyPage(<ImportExportPage />) }, { path: 'barcodes', element: lazyPage(<BarcodesPage />) },
    { path: 'reports', element: lazyPage(<ReportsPage />) }, { path: 'settings', element: lazyPage(<SettingsAdminPage />) }, { path: 'policies', element: lazyPage(<PolicyPagesAdminPage />) },
    { path: 'about', element: lazyPage(<AboutAdminPage />) },
    { path: 'home-page', element: lazyPage(<HomePageAdminPage />) },
    { path: 'store-page', element: lazyPage(<StorePageAdminPage />) },
    { path: 'contact-page', element: lazyPage(<ContactPageAdminPage />) },
    { path: 'catalog-content', element: lazyPage(<CatalogContentAdminPage />) }, { path: 'services', element: lazyPage(<ServicesAdminPage />) }, { path: 'consultation-requests', element: lazyPage(<ConsultationRequestsAdminPage />) },
    { path: 'news', element: lazyPage(<NewsAdminPage />) }, { path: 'news/create', element: lazyPage(<NewsFormPage />) }, { path: 'news/:id/edit', element: lazyPage(<NewsFormPage />) }, { path: 'news/settings', element: lazyPage(<NewsPageSettingsAdminPage />) },
    { path: 'promotions', element: lazyPage(<PromotionsAdminPage />) }, { path: 'promotions/create', element: lazyPage(<PromotionFormPage />) }, { path: 'promotions/:id/edit', element: lazyPage(<PromotionFormPage />) }, { path: 'promotions/settings', element: lazyPage(<PromotionsPageSettingsAdminPage />) },
    { path: 'guides', element: lazyPage(<GuidesAdminPage />) }, { path: 'guides/create', element: lazyPage(<GuideFormAdminPage />) }, { path: 'guides/:id/edit', element: lazyPage(<GuideFormAdminPage />) }, { path: 'guides/settings', element: lazyPage(<GuidesPageSettingsAdminPage />) },
    { path: 'staff', element: lazyPage(<StaffManagementPage />) },
    { path: 'staff-roles', element: lazyPage(<StaffRolesPage />) },
    { path: 'audit-logs', element: lazyPage(<AuditLogsPage />) },
    { path: 'forbidden', element: <AdminForbiddenPage /> },
  ] }] },
  { path: '/', element: <StoreLayout />, children: [
    { index: true, element: <HomePage /> }, { path: 'san-pham', element: <ProductsPage /> }, { path: 'san-pham/:slug', element: <ProductPage /> }, { path: 'so-sanh', element: <ComparePage /> }, { path: 'tim-mau-toc', element: <HairFinderPage /> },
    { path: 'danh-muc/:slug', element: <ProductsPage /> }, { path: 'tim-kiem', element: <ProductsPage /> }, { path: 'gio-hang', element: <CartPage /> },
    { path: 'dang-nhap', element: <LoginPage /> }, { path: 'dang-ky', element: <RegisterPage /> }, { path: 'quen-mat-khau', element: <ForgotPasswordPage /> }, { path: 'dat-lai-mat-khau', element: <ResetPasswordPage /> },
    { path: 'gioi-thieu', element: <AboutPage /> },
    { path: 'huong-dan/:slug', element: <GuideDetailPage /> },
    { path: 'tin-tuc', element: <NewsPage /> }, { path: 'tin-tuc/:slug', element: <NewsDetailPage /> }, { path: 'uu-dai', element: <PromotionsPage /> }, { path: 'uu-dai/:slug', element: <PromotionDetailPage /> }, { path: 'huong-dan', element: <GuidePage /> }, { path: 'he-thong-cua-hang', element: <StoreLocationsPage /> }, { path: 'lien-he', element: <ContactPage /> }, { path: 'dat-lich', element: <AppointmentPage /> }, { path: 'dich-vu-cham-soc', element: lazyPage(<HairGuidePage />) }, { path: 'huong-dan-chon-toc', element: <Navigate to="/dich-vu-cham-soc" replace /> },
    { path: 'chinh-sach-giao-hang', element: <ContentPage page="chinh-sach-giao-hang" /> }, { path: 'chinh-sach-doi-tra', element: <ContentPage page="chinh-sach-doi-tra" /> }, { path: 'chinh-sach-bao-mat', element: <ContentPage page="chinh-sach-bao-mat" /> },
    { path: 'thanh-toan', element: <CheckoutPage /> }, { path: 'dat-hang-thanh-cong/:orderNumber', element: <OrderSuccessPage /> }, { path: 'tra-cuu-don-hang', element: <OrderTrackingPage /> },
    { element: <UserProtectedRoute />, children: [{ path: 'tai-khoan', element: <AccountLayout />, children: [
      { index: true, element: <AccountIndexPage /> }, { path: 'ho-so', element: <ProfilePage /> }, { path: 'bao-mat', element: <SecurityPage /> }, { path: 'dia-chi', element: <AddressesPage /> }, { path: 'don-hang', element: <OrdersPage /> }, { path: 'don-hang/:orderNumber', element: <OrderDetailPage /> }, { path: 'yeu-thich', element: <WishlistPage /> },
      { path: 'doi-tra', element: <ReturnsPage /> }, { path: 'doi-tra/:id', element: <ReturnsPage /> },
      { path: 'bao-hanh', element: <WarrantiesPage /> }, { path: 'bao-hanh/:id', element: <WarrantiesPage /> },
      { path: 'lich-hen', element: <AppointmentsPage /> }, { path: 'lich-hen/:id', element: <AppointmentsPage /> },
    ] }] },
    { path: '*', element: <NotFoundPage /> },
  ] },
])
