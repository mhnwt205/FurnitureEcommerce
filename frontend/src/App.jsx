import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import PaymentResult from './pages/PaymentResult';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminCategories from './pages/AdminCategories';
import AdminDashboard from './pages/AdminDashboard';
import AdminCustomers from './pages/AdminCustomers';
import AdminAccounts from './pages/AdminAccounts';
import AdminReviews from './pages/AdminReviews';
import AdminConsultationRequests from './pages/AdminConsultationRequests';
import AdminPromotions from './pages/AdminPromotions';
import MyOrders from './pages/MyOrders';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import StoreSystem from './pages/StoreSystem';
import Promotions from './pages/Promotions';
import DesignServices from './pages/DesignServices';
import SpaceInspiration from './pages/SpaceInspiration';
import FeaturedProjects from './pages/FeaturedProjects';
import ProjectDetail from './pages/ProjectDetail';
import About from './pages/About';
import BlogDetail from './pages/BlogDetail';
import CustomerProfile from './pages/profile/CustomerProfile';
import CustomerOrderPage from './pages/profile/CustomerOrderPage';
import FloatingButtons from './components/common/FloatingButtons';
import AISalesAdvisor from './components/ai/AISalesAdvisor';
import AdminRoute from './components/common/AdminRoute';
import ScrollToTop from './components/common/ScrollToTop';

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/payment-result" element={<PaymentResult />} />
        <Route path="/my-orders" element={<MyOrders />} />
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
        <Route path="/profile/orders/:id" element={<CustomerOrderPage />} />
      </Routes>
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
      <AppContent />
    </Router>
  );
}

export default App;
