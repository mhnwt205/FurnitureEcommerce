import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import PaymentResult from './pages/PaymentResult';
import OrderLookup from './pages/OrderLookup';
import GuestOrderManage from './pages/GuestOrderManage';

import AdminCategories from './pages/AdminCategories';

import AdminAccounts from './pages/AdminAccounts';
import AdminReviews from './pages/AdminReviews';

import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import Promotions from './pages/Promotions';
import DesignServices from './pages/DesignServices';

import CustomerProfile from './pages/profile/CustomerProfile';
import CustomerOrderPage from './pages/profile/CustomerOrderPage';
import FloatingButtons from './components/common/FloatingButtons';
import AISalesAdvisor from './components/ai/AISalesAdvisor';
import AdminRoute from './components/common/AdminRoute';
import ScrollToTop from './components/common/ScrollToTop';
import { useAuth } from './context/AuthContext';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminProducts = lazy(() => import('./pages/AdminProducts'));
const AdminCustomers = lazy(() => import('./pages/AdminCustomers'));
const AdminConsultationRequests = lazy(() => import('./pages/AdminConsultationRequests'));
const AdminPromotions = lazy(() => import('./pages/AdminPromotions'));
const StoreSystem = lazy(() => import('./pages/StoreSystem'));
const SpaceInspiration = lazy(() => import('./pages/SpaceInspiration'));
const FeaturedProjects = lazy(() => import('./pages/FeaturedProjects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const About = lazy(() => import('./pages/About'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));

function RouteFallback() {
  return <div className="min-h-screen bg-white" role="status" aria-live="polite" />;
}

const protectedExactPaths = new Set();
const protectedPathPrefixes = ['/admin', '/profile'];

const isProtectedPath = (pathname) => (
  protectedExactPaths.has(pathname) ||
  protectedPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
);

function AuthRedirectBoundary() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authStatus } = useAuth();

  useEffect(() => {
    if (authStatus !== 'unauthenticated') return;
    if (!isProtectedPath(location.pathname)) return;

    navigate('/login', {
      replace: true,
      state: { from: location }
    });
  }, [authStatus, location, navigate]);

  return null;
}
function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/payment-result" element={<PaymentResult />} />
        <Route path="/orders/lookup" element={<OrderLookup />} />
        <Route path="/orders/manage" element={<GuestOrderManage />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/admin/dashboard" element={<AdminRoute allowedRoles={['admin', 'staff']} requiredPermission="dashboard.view"><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute allowedRoles={['admin', 'staff']} requiredPermission="order.view"><AdminOrders /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute allowedRoles={['admin', 'staff']} requiredPermission="product.view"><AdminProducts /></AdminRoute>} />
        <Route path="/admin/categories" element={<AdminRoute allowedRoles={['admin', 'staff']} requiredPermission="category.view"><AdminCategories /></AdminRoute>} />
        <Route path="/admin/customers" element={<AdminRoute allowedRoles={['admin', 'staff']} requiredPermission="customer.view"><AdminCustomers /></AdminRoute>} />
        <Route path="/admin/reviews" element={<AdminRoute allowedRoles={['admin', 'staff']} requiredPermission="review.view"><AdminReviews /></AdminRoute>} />
        <Route path="/admin/consultation-requests" element={<AdminRoute allowedRoles={['admin', 'staff']} requiredPermission="consultation.view"><AdminConsultationRequests /></AdminRoute>} />
        <Route path="/admin/accounts" element={<AdminRoute allowedRoles={['admin', 'staff']} requiredPermission="admin_account.view"><AdminAccounts /></AdminRoute>} />
        <Route path="/admin/promotions" element={<AdminRoute allowedRoles={['admin', 'staff']} requiredPermission="promotion.view"><AdminPromotions /></AdminRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/stores" element={<StoreSystem />} />
        <Route path="/promotions" element={<Promotions />} />
        <Route path="/design-service" element={<DesignServices />} />
        <Route path="/featured-projects" element={<FeaturedProjects />} />
        <Route path="/featured-projects/:slug" element={<ProjectDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/inspirations" element={<SpaceInspiration />} />
        <Route path="/blogs/:slug" element={<BlogDetail />} />
        <Route path="/profile" element={<CustomerProfile />} />
        <Route path="/profile/orders" element={<CustomerProfile />} />
        <Route path="/profile/orders/:id" element={<CustomerOrderPage />} />
        </Routes>
      </Suspense>
      {!isAdminRoute && (
        <>
          <FloatingButtons />
          <AISalesAdvisor />
        </>
      )}
    </>
  );
}

import Toast from './components/common/Toast';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Toast />
      <AuthRedirectBoundary />
      <AppContent />
    </Router>
  );
}

export default App;
