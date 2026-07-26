import Header from '../../components/common/Header.jsx';
import Footer from '../../components/common/Footer.jsx';
import SupportChatPanel from '../../components/support/SupportChatPanel.jsx';

export default function SupportConversations() {
  return <div className="flex min-h-screen flex-col bg-[#f7f7f5]"><Header /><main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 py-8 sm:px-6 lg:py-12"><div className="mb-5"><p className="text-sm text-[#777777]">Tài khoản</p><h1 className="mt-1 text-2xl font-bold text-[#333333]">Hỗ trợ trực tuyến</h1><p className="mt-2 text-sm leading-6 text-[#777777]">Trao đổi trực tiếp với nhân viên về đơn hàng hoặc sản phẩm của bạn.</p></div><SupportChatPanel active fullPage /></main><Footer /></div>;
}
