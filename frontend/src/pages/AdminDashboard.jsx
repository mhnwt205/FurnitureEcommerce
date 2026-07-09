import React, { useState, useEffect } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import dashboardService from '../services/api/dashboardService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { getStaticFileUrl } from '../utils/imageUtils';
import { formatPrice } from '../utils/formatters';
import { ADMIN_ORDER_STATUS_LABELS as statusLabels, getAdminOrderStatusColorClass as getStatusColorClass } from '../utils/statusMaps';
import Skeleton from '../components/ui/Skeleton';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const revenuePresets = [
  { key: 'today', label: 'Hôm nay' },
  { key: '7days', label: '7 ngày' },
  { key: '30days', label: '30 ngày' },
  { key: 'month', label: 'Tháng này' }
];

const revenueKpis = [
  { key: 'totalRevenue', label: 'Tổng doanh thu thực thu', icon: 'payments', type: 'money' },
  { key: 'paidOrders', label: 'Đơn đã thanh toán', icon: 'receipt_long' },
  { key: 'successfulOrders', label: 'Đơn giao thành công', icon: 'task_alt' },
  { key: 'cancelledOrders', label: 'Đơn đã hủy', icon: 'cancel' },
  { key: 'averageOrderValue', label: 'Giá trị đơn trung bình', icon: 'monitoring', type: 'money' }
];

const revenueStatusKeys = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled'];

const revenueStatusChartColors = {
  pending: '#D9B75F',
  confirmed: '#8A6B52',
  preparing: '#C7A77A',
  shipping: '#6F8FAF',
  delivered: '#7EA172',
  completed: '#4F7D5B',
  cancelled: '#C76D63'
};

const padNumber = (value) => String(value).padStart(2, '0');

const toDatetimeLocalValue = (date) => {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const hours = padNumber(date.getHours());
  const minutes = padNumber(date.getMinutes());
  const seconds = padNumber(date.getSeconds());

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const startOfLocalDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const endOfLocalDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
};

const getRevenuePresetRange = (preset = '30days') => {
  const now = new Date();
  const to = endOfLocalDay(now);
  let from = startOfLocalDay(now);

  if (preset === '7days') {
    from.setDate(from.getDate() - 6);
  } else if (preset === '30days') {
    from.setDate(from.getDate() - 29);
  } else if (preset === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  return {
    from: toDatetimeLocalValue(from),
    to: toDatetimeLocalValue(to)
  };
};

const getRevenueRangeDayCount = (fromDate, toDate) => {
  const fromDay = startOfLocalDay(fromDate);
  const toDay = startOfLocalDay(toDate);
  return Math.floor((toDay.getTime() - fromDay.getTime()) / MS_PER_DAY) + 1;
};

const validateRevenueRange = ({ from, to }) => {
  if (!from || !to) {
    return 'Vui lòng chọn đầy đủ Từ ngày - giờ và Đến ngày - giờ.';
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return 'Khoảng thời gian không hợp lệ.';
  }

  if (fromDate > toDate) {
    return 'Từ ngày - giờ không được lớn hơn Đến ngày - giờ.';
  }

  if (getRevenueRangeDayCount(fromDate, toDate) > 366) {
    return 'Khoảng thời gian thống kê tối đa là 366 ngày.';
  }

  return '';
};

const buildRevenueParams = ({ from, to }) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (toDate.getHours() === 23 && toDate.getMinutes() === 59 && toDate.getSeconds() === 59) {
    toDate.setMilliseconds(999);
  }

  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString()
  };
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [widgets, setWidgets] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revenueRange, setRevenueRange] = useState(() => getRevenuePresetRange('30days'));
  const [activeRevenuePreset, setActiveRevenuePreset] = useState('30days');
  const [revenueData, setRevenueData] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState('');
  const [revenueValidationError, setRevenueValidationError] = useState('');
  const navigate = useNavigate();

  const fetchRevenue = async (range = revenueRange) => {
    const validationMessage = validateRevenueRange(range);

    if (validationMessage) {
      setRevenueValidationError(validationMessage);
      return;
    }

    setRevenueLoading(true);
    setRevenueError('');
    setRevenueValidationError('');

    try {
      const data = await dashboardService.getRevenue(buildRevenueParams(range));
      setRevenueData(data);
    } catch (err) {
      setRevenueError(err.message || 'Không thể tải báo cáo doanh thu.');
    } finally {
      setRevenueLoading(false);
    }
  };

  const handleRevenueRangeChange = (field, value) => {
    setActiveRevenuePreset('custom');
    setRevenueRange(prev => ({ ...prev, [field]: value }));
  };

  const handleRevenuePreset = (preset) => {
    const nextRange = getRevenuePresetRange(preset);
    setActiveRevenuePreset(preset);
    setRevenueRange(nextRange);
    fetchRevenue(nextRange);
  };

  const handleRevenueApply = () => {
    fetchRevenue(revenueRange);
  };

  const handleRevenueReset = () => {
    const nextRange = getRevenuePresetRange('30days');
    setActiveRevenuePreset('30days');
    setRevenueRange(nextRange);
    fetchRevenue(nextRange);
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [sumRes, widgetRes] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getWidgets()
        ]);
        setSummary(sumRes);
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

  useEffect(() => {
    fetchRevenue(revenueRange);
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

  if (error || !summary || !widgets) {
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
  const revenueStatusChartData = revenueStatusKeys
    .map((status) => ({
      status,
      label: statusLabels[status] || status,
      value: revenueData?.statusCounts?.[status] || 0,
      color: revenueStatusChartColors[status] || '#8D7B68'
    }))
    .filter((item) => item.value > 0);
  const revenueStatusTotal = revenueStatusChartData.reduce((total, item) => total + item.value, 0);
  return (
    <AdminLayout>
      <div className="mx-auto max-w-[1440px] space-y-5 overflow-x-hidden px-4 py-5 md:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-terracotta">Quản trị vận hành</p>
            <h1 className="font-display-lg text-3xl text-primary tracking-tight md:text-4xl">Dashboard Quản Trị</h1>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-on-surface-variant">
          </p>
        </div>
        {/* Overview Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-surface-beige/80 bg-white p-5 shadow-[0_4px_18px_rgba(93,64,55,0.045)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Tổng đơn hàng</p>
                <h3 className="font-display-md text-3xl leading-none text-primary">{summary?.totalOrders || 0}</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[24px]">shopping_bag</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-surface-beige/80 bg-white p-5 shadow-[0_4px_18px_rgba(93,64,55,0.045)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Tổng khách hàng</p>
                <h3 className="font-display-md text-3xl leading-none text-primary">{summary?.totalCustomers || 0}</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-terracotta/10 text-accent-terracotta">
                <span className="material-symbols-outlined text-[24px]">group</span>
              </div>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-surface-beige/70 bg-white shadow-[0_4px_24px_rgba(93,64,55,0.05)]" aria-busy={revenueLoading}>
          <div className="border-b border-surface-beige/80 p-5 md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <p className="font-label-lg text-accent-terracotta uppercase tracking-widest">Báo cáo doanh thu thực thu</p>
                <h2 className="mt-2 font-display-md text-2xl text-primary">Doanh thu theo thời điểm thanh toán</h2>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {revenuePresets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    aria-pressed={activeRevenuePreset === preset.key}
                    onClick={() => handleRevenuePreset(preset.key)}
                    className={`rounded-full border px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${activeRevenuePreset === preset.key ? 'border-primary bg-primary text-white' : 'border-surface-beige bg-white text-on-surface-variant hover:border-accent-terracotta hover:text-primary'}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 items-end gap-3 xl:grid-cols-[minmax(210px,1fr)_minmax(210px,1fr)_auto_auto]">
              <div>
                <label htmlFor="revenue-from" className="mb-2 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">Từ ngày - giờ</label>
                <input
                  id="revenue-from"
                  type="datetime-local"
                  step="1"
                  value={revenueRange.from}
                  onChange={(event) => handleRevenueRangeChange('from', event.target.value)}
                  className="h-11 w-full rounded-lg border border-surface-beige bg-white px-3 text-sm text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div>
                <label htmlFor="revenue-to" className="mb-2 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">Đến ngày - giờ</label>
                <input
                  id="revenue-to"
                  type="datetime-local"
                  step="1"
                  value={revenueRange.to}
                  onChange={(event) => handleRevenueRangeChange('to', event.target.value)}
                  className="h-11 w-full rounded-lg border border-surface-beige bg-white px-3 text-sm text-primary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <button
                type="button"
                onClick={handleRevenueApply}
                disabled={revenueLoading}
                className="h-11 rounded-lg bg-primary px-5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-terracotta disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {revenueLoading ? 'Đang tải...' : 'Áp dụng'}
              </button>
              <button
                type="button"
                onClick={handleRevenueReset}
                disabled={revenueLoading}
                className="h-11 rounded-lg border border-surface-beige bg-white px-5 text-sm font-bold uppercase tracking-wide text-primary transition-colors hover:border-accent-terracotta hover:text-accent-terracotta disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                Đặt lại
              </button>
            </div>

            {revenueValidationError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {revenueValidationError}
              </div>
            )}
          </div>

          <div className="space-y-5 p-5 md:p-6">
            {revenueError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
                <span className="material-symbols-outlined text-4xl mb-2">error</span>
                <h3 className="font-label-lg text-base mb-2">Không thể tải báo cáo doanh thu</h3>
                <p className="text-sm mb-4">{revenueError}</p>
                <button
                  type="button"
                  onClick={() => fetchRevenue(revenueRange)}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-label-lg hover:bg-red-700 transition-colors"
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {revenueKpis.map((item) => {
                    const rawValue = revenueData?.summary?.[item.key] || 0;
                    const isPrimaryKpi = item.key === 'totalRevenue';
                    const displayValue = item.type === 'money' ? formatPrice(rawValue) : rawValue;

                    return (
                      <div
                        key={item.key}
                        className={`${isPrimaryKpi ? 'xl:col-span-2 border-primary bg-primary text-white' : 'border-surface-beige/80 bg-surface-warm/60 text-primary'} min-h-[132px] rounded-2xl border p-4 shadow-[0_3px_14px_rgba(93,64,55,0.04)]`}
                      >
                        {revenueLoading && !revenueData ? (
                          <div className="space-y-4">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-8 w-32" />
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`${isPrimaryKpi ? 'text-white/75' : 'text-on-surface-variant'} line-clamp-2 text-[11px] font-bold uppercase leading-relaxed tracking-[0.12em]`}>{item.label}</p>
                              <p className={`${isPrimaryKpi ? 'mt-4 text-3xl md:text-[34px]' : 'mt-4 text-2xl'} whitespace-nowrap font-display-md leading-none`}>{displayValue}</p>
                            </div>
                            <span className={(isPrimaryKpi ? 'bg-white/12 text-white' : 'bg-white text-accent-terracotta') + ' material-symbols-outlined flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[20px]'}>
                              {item.icon}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                  <div className="h-[340px] rounded-2xl border border-surface-beige/80 bg-white p-5 shadow-[0_3px_16px_rgba(93,64,55,0.04)]">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-label-lg uppercase tracking-widest text-primary">Biểu đồ doanh thu</h3>
                        <p className="mt-1 text-sm text-on-surface-variant">Theo ngày ghi nhận thanh toán</p>
                      </div>
                    </div>
                    {revenueLoading && !revenueData ? (
                      <div className="flex h-[260px] items-end gap-3" aria-hidden="true">
                        {Array.from({ length: 10 }).map((_, index) => (
                          <Skeleton key={index} className="min-w-0 flex-1" style={{ height: `${60 + (index % 5) * 28}px` }} />
                        ))}
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="78%">
                        <BarChart data={revenueData?.chartData || []} margin={{ top: 10, right: 24, left: 8, bottom: 0 }}>
                          <XAxis dataKey="date" interval={Math.max(Math.ceil((revenueData?.chartData?.length || 1) / 8) - 1, 0)} tick={{ fontSize: 12, fill: '#8D7B68' }} axisLine={false} tickLine={false} dy={10} />
                          <YAxis tickFormatter={(value) => formatPrice(value).replace(/\s?₫$/, '')} tick={{ fontSize: 12, fill: '#8D7B68' }} axisLine={false} tickLine={false} width={76} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D8" />
                          <RechartsTooltip
                            formatter={(value, name) => [name === 'orders' ? `${value} đơn` : formatPrice(value), name === 'orders' ? 'Số đơn' : 'Doanh thu']}
                            labelStyle={{ color: '#5D4037', fontWeight: 'bold', marginBottom: '8px' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                            cursor={{ fill: '#F5F0E6' }}
                          />
                          <Bar dataKey="revenue" fill="#8A6B52" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    {!revenueLoading && revenueData?.summary?.totalRevenue === 0 && (
                      <p className="text-center text-sm text-on-surface-variant mt-2">Chưa có doanh thu thực thu trong khoảng thời gian này.</p>
                    )}
                  </div>

                  <div className="h-[340px] rounded-2xl border border-surface-beige/80 bg-white p-5 shadow-[0_3px_16px_rgba(93,64,55,0.04)]">
                    <h3 className="mb-1 font-label-lg uppercase tracking-widest text-primary">Trạng thái đơn</h3>
                    <p className="mb-4 text-sm text-on-surface-variant">Tổng đơn tạo trong cùng khoảng thời gian.</p>
                    {revenueLoading && !revenueData ? (
                      <div className="flex h-[260px] items-center justify-center">
                        <Skeleton className="h-[220px] w-[220px] rounded-full" />
                      </div>
                    ) : revenueStatusTotal > 0 ? (
                      <>
                        <div className="relative flex h-[260px] items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={revenueStatusChartData}
                                dataKey="value"
                                nameKey="label"
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={104}
                                paddingAngle={2}
                                stroke="#fff"
                                strokeWidth={2}
                              >
                                {revenueStatusChartData.map((entry) => (
                                  <Cell key={entry.status} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(value, _name, props) => [`${value} đơn`, props?.payload?.label || 'Trạng thái']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-display-sm text-primary leading-none">{revenueStatusTotal}</span>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">đơn</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="h-[280px] flex flex-col items-center justify-center text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl mb-2">donut_large</span>
                        <p className="text-sm">Chưa có đơn hàng trong khoảng thời gian này.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-surface-beige/80 bg-white p-5 shadow-[0_3px_16px_rgba(93,64,55,0.04)]">
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="font-label-lg uppercase tracking-widest text-primary">Top 5 sản phẩm theo doanh thu</h3>
                      <p className="mt-1 text-sm text-on-surface-variant">Dựa trên doanh thu thực thu từ dòng sản phẩm trong đơn hàng.</p>
                    </div>
                  </div>
                  <div className="divide-y divide-surface-beige/80">
                    {revenueLoading && !revenueData ? (
                      Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="my-2 h-16 rounded-xl" />)
                    ) : revenueData?.topProducts?.length > 0 ? (
                      revenueData.topProducts.map((product, index) => {
                        const imageUrl = getStaticFileUrl(product.imageUrl);
                        return (
                          <div key={product.productId} className="grid grid-cols-[32px_56px_minmax(0,1fr)] items-center gap-3 py-3 sm:grid-cols-[32px_56px_minmax(0,1fr)_auto]">
                            <div className="contents">
                              <div className="text-center text-xs font-bold text-on-surface-variant">#{index + 1}</div>
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-beige/40">
                                {imageUrl ? (
                                  <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                ) : (
                                  <span className="material-symbols-outlined text-on-surface-variant">inventory_2</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="line-clamp-1 text-sm font-semibold text-primary">{product.name}</h4>
                                <p className="mt-1 text-xs text-on-surface-variant">Đã bán <span className="font-bold text-primary">{product.quantity}</span></p>
                              </div>
                            </div>
                            <div className="col-start-3 whitespace-nowrap text-sm font-bold text-accent-terracotta sm:col-start-auto sm:text-right">
                              {formatPrice(product.revenue)}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-surface-beige bg-surface-warm/50 px-4 py-8 text-center text-sm text-on-surface-variant">
                        Chưa có sản phẩm phát sinh doanh thu trong khoảng thời gian này.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Recent Orders */}
        <section className="space-y-5">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-surface-beige/80 bg-white shadow-[0_3px_16px_rgba(93,64,55,0.04)]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-surface-beige bg-white p-5">
              <h3 className="font-label-lg text-primary uppercase tracking-widest">Đơn hàng mới nhất</h3>
              <Link to="/admin/orders" className="flex items-center gap-1 text-sm font-bold text-accent-terracotta transition-colors hover:text-primary">Xem tất cả <span className="material-symbols-outlined text-[16px]">arrow_forward</span></Link>
            </div>
            <div className="overflow-x-auto">
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

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="flex flex-col overflow-hidden rounded-2xl border border-surface-beige/80 bg-white shadow-[0_3px_16px_rgba(93,64,55,0.04)]">
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-surface-beige bg-white p-5">
                <h3 className="font-label-lg text-primary uppercase tracking-widest">Khách hàng mới nhất</h3>
                <Link to="/admin/customers" className="flex items-center gap-1 text-sm font-bold text-accent-terracotta transition-colors hover:text-primary">Xem tất cả <span className="material-symbols-outlined text-[16px]">arrow_forward</span></Link>
              </div>
              <div className="space-y-3 p-5">
                {widgets?.newCustomers?.map(customer => (
                  <div key={customer.id} className="flex items-center gap-3 rounded-xl bg-surface-warm/55 p-3 transition-colors hover:bg-surface-beige/50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold uppercase text-white">
                      {customer.fullName ? customer.fullName.charAt(0) : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-semibold text-primary">{customer.fullName}</h4>
                      <p className="mt-1 truncate text-xs text-on-surface-variant">{customer.email}</p>
                    </div>
                    <div className="whitespace-nowrap rounded-md bg-surface-beige/50 px-3 py-1.5 text-right text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {new Date(customer.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                ))}
                {(!widgets?.newCustomers || widgets.newCustomers.length === 0) && (
                  <div className="p-8 text-center text-on-surface-variant italic">Chưa có khách hàng mới</div>
                )}
              </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-2xl border border-surface-beige/80 bg-white shadow-[0_3px_16px_rgba(93,64,55,0.04)]">
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-surface-beige bg-white p-5">
                <h3 className="font-label-lg text-primary uppercase tracking-widest">Thao tác nhanh</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 p-6">
                <button onClick={() => navigate('/admin/products')} className="group flex flex-col items-center justify-center rounded-2xl border border-surface-beige bg-surface-beige/20 p-6 transition-colors hover:border-primary hover:bg-primary">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-sm transition-colors group-hover:bg-white/20 group-hover:text-white">
                    <span className="material-symbols-outlined text-3xl">add_circle</span>
                  </div>
                  <span className="text-center text-[11px] font-bold uppercase tracking-widest text-primary transition-colors group-hover:text-white">Thêm sản phẩm</span>
                </button>

                <button onClick={() => navigate('/admin/categories')} className="group flex flex-col items-center justify-center rounded-2xl border border-surface-beige bg-surface-beige/20 p-6 transition-colors hover:border-primary hover:bg-primary">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-sm transition-colors group-hover:bg-white/20 group-hover:text-white">
                    <span className="material-symbols-outlined text-3xl">category</span>
                  </div>
                  <span className="text-center text-[11px] font-bold uppercase tracking-widest text-primary transition-colors group-hover:text-white">Danh mục</span>
                </button>

                <button onClick={() => navigate('/admin/accounts')} className="group flex flex-col items-center justify-center rounded-2xl border border-surface-beige bg-surface-beige/20 p-6 transition-colors hover:border-primary hover:bg-primary">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-sm transition-colors group-hover:bg-white/20 group-hover:text-white">
                    <span className="material-symbols-outlined text-3xl">person_add</span>
                  </div>
                  <span className="text-center text-[11px] font-bold uppercase tracking-widest text-primary transition-colors group-hover:text-white">Tạo nhân viên</span>
                </button>

                <button onClick={() => navigate('/admin/orders')} className="group flex flex-col items-center justify-center rounded-2xl border border-surface-beige bg-surface-beige/20 p-6 transition-colors hover:border-primary hover:bg-primary">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-sm transition-colors group-hover:bg-white/20 group-hover:text-white">
                    <span className="material-symbols-outlined text-3xl">receipt_long</span>
                  </div>
                  <span className="text-center text-[11px] font-bold uppercase tracking-widest text-primary transition-colors group-hover:text-white">Xem đơn hàng</span>
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}
