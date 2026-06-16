import React, { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import dashboardService from '../services/api/dashboardService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { getStaticFileUrl } from '../utils/imageUtils';

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

const statusColors = {
  pending: '#F59E0B', // gold
  confirmed: '#3B82F6', // blue
  preparing: '#8B5CF6', // purple
  shipping: '#0EA5E9', // cyan
  delivered: '#10B981', // green
  completed: '#059669', // dark green
  cancelled: '#EF4444' // red
};

const statusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

const getStatusColorClass = (status) => {
  switch(status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'confirmed': return 'bg-blue-100 text-blue-800';
    case 'preparing': return 'bg-purple-100 text-purple-800';
    case 'shipping': return 'bg-sky-100 text-sky-800';
    case 'delivered': return 'bg-emerald-100 text-emerald-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [widgets, setWidgets] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [sumRes, chartRes, widgetRes] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getCharts(),
          dashboardService.getWidgets()
        ]);
        setSummary(sumRes);
        setCharts(chartRes);
        setWidgets(widgetRes);
        setError(false);
      } catch (err) {
        console.error('Lỗi tải dashboard:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 flex justify-center items-center h-[80vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !summary || !charts || !widgets) {
    return (
      <AdminLayout>
        <div className="p-8 max-w-7xl mx-auto space-y-6">
          <h1 className="text-2xl font-display-sm text-primary mb-6">Dashboard Quản Trị</h1>
          <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 flex flex-col items-center justify-center h-[400px]">
            <span className="material-symbols-outlined text-5xl mb-4">error</span>
            <h2 className="text-xl font-bold mb-2">Không thể tải dữ liệu Dashboard</h2>
            <p className="text-sm">Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Thử lại</button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Formatting Pie Chart Data
  const pieData = Object.keys(summary.statusCounts || {})
    .filter(key => summary.statusCounts[key] > 0)
    .map(key => ({
      name: statusLabels[key],
      value: summary.statusCounts[key],
      color: statusColors[key]
    }));

  return (
    <AdminLayout>
      <div className="p-8 max-w-[1400px] mx-auto space-y-8">
        <h1 className="font-display-lg text-4xl text-primary tracking-tight mb-8">Dashboard Quản Trị</h1>

        {/* Row 1: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2">Doanh thu hôm nay</p>
                <h3 className="text-[28px] font-display-sm text-primary group-hover:text-accent-terracotta transition-colors leading-none">{formatPrice(summary?.todayRevenue || 0)}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#8A6B52]/10 text-[#8A6B52] flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">payments</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2">Doanh thu tháng này</p>
                <h3 className="text-[28px] font-display-sm text-primary group-hover:text-accent-terracotta transition-colors leading-none">{formatPrice(summary?.monthRevenue || 0)}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">trending_up</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2">Tổng đơn hàng</p>
                <h3 className="text-[32px] font-display-sm text-primary group-hover:text-accent-terracotta transition-colors leading-none">{summary?.totalOrders || 0}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">shopping_bag</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2">Tổng khách hàng</p>
                <h3 className="text-[32px] font-display-sm text-primary group-hover:text-accent-terracotta transition-colors leading-none">{summary?.totalCustomers || 0}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent-terracotta/10 text-accent-terracotta flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[24px]">group</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Secondary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] flex items-center gap-5 hover:bg-surface-beige/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">pending_actions</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest mb-1">Chờ xác nhận</p>
              <h3 className="text-2xl font-display-sm text-primary">{summary?.statusCounts.pending || 0}</h3>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] flex items-center gap-5 hover:bg-surface-beige/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">local_shipping</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest mb-1">Đang giao</p>
              <h3 className="text-2xl font-display-sm text-primary">{summary?.statusCounts.shipping || 0}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] flex items-center gap-5 hover:bg-surface-beige/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">task_alt</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest mb-1">Hoàn thành</p>
              <h3 className="text-2xl font-display-sm text-primary">{summary?.statusCounts.completed || 0}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] flex items-center gap-5 hover:bg-surface-beige/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">cancel</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest mb-1">Đã hủy</p>
              <h3 className="text-2xl font-display-sm text-primary">{summary?.statusCounts.cancelled || 0}</h3>
            </div>
          </div>
        </div>

        {/* Row 3: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-8 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] h-[400px]">
            <h3 className="font-label-lg text-primary uppercase tracking-widest mb-8 border-b border-surface-beige pb-4">Doanh thu 30 ngày gần nhất</h3>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={charts?.chartData || []} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#8D7B68'}} axisLine={false} tickLine={false} dy={10} />
                <YAxis tickFormatter={(val) => new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(val)} tick={{fontSize: 12, fill: '#8D7B68'}} axisLine={false} tickLine={false} dx={-10} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D8" />
                <RechartsTooltip 
                  formatter={(value) => [formatPrice(value), 'Doanh thu']} 
                  labelStyle={{color: '#5D4037', fontWeight: 'bold', marginBottom: '8px'}} 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}}
                  cursor={{fill: '#F5F0E6'}}
                />
                <Bar dataKey="revenue" fill="#8A6B52" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-8 rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] h-[400px] flex flex-col">
            <h3 className="font-label-lg text-primary uppercase tracking-widest mb-4 border-b border-surface-beige pb-4 shrink-0">Trạng thái đơn hàng</h3>
            <div className="flex-1 relative min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius="60%"
                    outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value) => [value + ' đơn', 'Số lượng']} 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center" 
                    iconType="circle"
                    wrapperStyle={{fontSize: '12px', fontFamily: 'Montserrat', paddingTop: '20px'}}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{top: '-10%'}}>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Tổng đơn</span>
                <span className="text-3xl font-display-sm text-primary">{summary?.totalOrders || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 4: Recent Orders + Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-surface-beige flex justify-between items-center bg-white shrink-0">
              <h3 className="font-label-lg text-primary uppercase tracking-widest">Đơn hàng mới nhất</h3>
              <Link to="/admin/orders" className="text-sm text-accent-terracotta hover:underline font-label-md flex items-center gap-1">Xem tất cả <span className="material-symbols-outlined text-[16px]">arrow_forward</span></Link>
            </div>
            <div className="overflow-x-auto p-2">
              <table className="w-full text-left font-body-sm">
                <thead className="bg-surface-ivory text-xs text-on-surface-variant font-label-lg uppercase tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold text-left">Mã đơn</th>
                    <th className="p-4 font-semibold text-left">Khách hàng</th>
                    <th className="p-4 font-semibold text-right">Tổng tiền</th>
                    <th className="p-4 font-semibold text-center w-[140px]">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-beige">
                  {widgets?.recentOrders?.map(order => (
                    <tr key={order.id} className="hover:bg-surface-beige/50 transition-colors cursor-pointer border-b border-surface-beige/50 last:border-0" onClick={() => navigate(`/admin/orders?id=${order.id}`)}>
                      <td className="p-5 font-bold text-primary text-left text-[14px]">{order.orderCode || order.id}</td>
                      <td className="p-5 text-on-surface text-left text-[14px] font-medium">{order.fullName}</td>
                      <td className="p-5 font-bold text-accent-terracotta text-right text-[14px]">{formatPrice(order.totalAmount)}</td>
                      <td className="p-5 text-center align-middle">
                        <span className={`inline-flex items-center justify-center whitespace-nowrap min-w-fit px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold leading-none ${getStatusColorClass(order.status)}`}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!widgets?.recentOrders || widgets.recentOrders.length === 0) && (
                    <tr><td colSpan="4" className="p-8 text-center text-on-surface-variant italic">Chưa có đơn hàng nào</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-surface-beige flex justify-between items-center bg-white shrink-0">
              <h3 className="font-label-lg text-primary uppercase tracking-widest">Top sản phẩm bán chạy</h3>
            </div>
            <div className="p-6 space-y-3">
              {widgets?.topProducts?.map((product, idx) => (
                <div key={product.id} className="flex items-center gap-5 p-4 rounded-xl hover:bg-surface-beige/40 transition-colors border border-transparent hover:border-surface-beige">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display-sm text-lg shrink-0 ${idx === 0 ? 'bg-accent-gold/20 text-accent-gold font-bold' : idx === 1 ? 'bg-[#94A3B8]/20 text-[#64748B] font-bold' : idx === 2 ? 'bg-[#D97706]/20 text-[#B45309] font-bold' : 'bg-surface-beige text-on-surface-variant'}`}>
                    {idx + 1}
                  </div>
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-sm border border-outline-variant/10">
                    <img 
                      src={getStaticFileUrl(product.imageUrl) || 'https://placehold.co/100x100?text=SP'} 
                      alt={product.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => { e.target.src = 'https://placehold.co/100x100?text=SP'; }}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-label-lg text-primary line-clamp-1 text-[15px]">{product.name}</h4>
                    <p className="text-body-sm text-on-surface-variant mt-1.5">Đã bán: <span className="font-bold text-accent-terracotta ml-1">{product.sold}</span> sản phẩm</p>
                  </div>
                </div>
              ))}
              {(!widgets?.topProducts || widgets.topProducts.length === 0) && (
                <div className="p-8 text-center text-on-surface-variant italic">Chưa có dữ liệu sản phẩm</div>
              )}
            </div>
          </div>
        </div>

        {/* Row 5: New Customers + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-surface-beige flex justify-between items-center bg-white shrink-0">
              <h3 className="font-label-lg text-primary uppercase tracking-widest">Khách hàng mới nhất</h3>
              <Link to="/admin/customers" className="text-sm text-accent-terracotta hover:underline font-label-md flex items-center gap-1">Xem tất cả <span className="material-symbols-outlined text-[16px]">arrow_forward</span></Link>
            </div>
            <div className="p-6 space-y-3">
              {widgets?.newCustomers?.map(customer => (
                <div key={customer.id} className="flex items-center gap-5 p-4 rounded-xl hover:bg-surface-beige/40 transition-colors border border-transparent hover:border-surface-beige">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent-terracotta text-white flex items-center justify-center shrink-0 uppercase font-display-sm text-xl shadow-sm">
                    {customer.fullName ? customer.fullName.charAt(0) : 'U'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-label-lg text-primary text-[15px]">{customer.fullName}</h4>
                    <p className="text-sm text-on-surface-variant mt-1">{customer.email}</p>
                  </div>
                  <div className="text-[11px] font-bold text-on-surface-variant text-right tracking-widest uppercase bg-surface-beige/50 px-3 py-1.5 rounded-md">
                    {new Date(customer.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              ))}
              {(!widgets?.newCustomers || widgets.newCustomers.length === 0) && (
                <div className="p-8 text-center text-on-surface-variant italic">Chưa có khách hàng mới</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border-none shadow-[0_4px_24px_rgba(93,64,55,0.05)] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-surface-beige flex justify-between items-center bg-white shrink-0">
              <h3 className="font-label-lg text-primary uppercase tracking-widest">Thao tác nhanh</h3>
            </div>
            <div className="p-8 grid grid-cols-2 gap-4">
              <button onClick={() => navigate('/admin/products')} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-surface-beige/20 border border-surface-beige hover:bg-primary hover:border-primary hover:-translate-y-1 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 rounded-full bg-white text-primary flex items-center justify-center mb-4 group-hover:bg-white/20 group-hover:text-white transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-3xl">add_circle</span>
                </div>
                <span className="font-bold text-[11px] uppercase tracking-widest text-primary group-hover:text-white transition-colors">Thêm sản phẩm</span>
              </button>
              
              <button onClick={() => navigate('/admin/categories')} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-surface-beige/20 border border-surface-beige hover:bg-primary hover:border-primary hover:-translate-y-1 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 rounded-full bg-white text-primary flex items-center justify-center mb-4 group-hover:bg-white/20 group-hover:text-white transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-3xl">category</span>
                </div>
                <span className="font-bold text-[11px] uppercase tracking-widest text-primary group-hover:text-white transition-colors">Danh mục</span>
              </button>

              <button onClick={() => navigate('/admin/accounts')} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-surface-beige/20 border border-surface-beige hover:bg-primary hover:border-primary hover:-translate-y-1 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 rounded-full bg-white text-primary flex items-center justify-center mb-4 group-hover:bg-white/20 group-hover:text-white transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-3xl">person_add</span>
                </div>
                <span className="font-bold text-[11px] uppercase tracking-widest text-primary group-hover:text-white transition-colors">Tạo nhân viên</span>
              </button>

              <button onClick={() => navigate('/admin/orders')} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-surface-beige/20 border border-surface-beige hover:bg-primary hover:border-primary hover:-translate-y-1 hover:shadow-lg transition-all group">
                <div className="w-14 h-14 rounded-full bg-white text-primary flex items-center justify-center mb-4 group-hover:bg-white/20 group-hover:text-white transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-3xl">receipt_long</span>
                </div>
                <span className="font-bold text-[11px] uppercase tracking-widest text-primary group-hover:text-white transition-colors">Xem đơn hàng</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
