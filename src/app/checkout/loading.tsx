export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-[#0f172b] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-8 bg-white/10 rounded-full w-40 animate-pulse" />
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-2xl p-6 h-64 animate-pulse" />
        <div className="bg-white rounded-2xl p-6 h-40 animate-pulse" />
        <div className="h-14 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
