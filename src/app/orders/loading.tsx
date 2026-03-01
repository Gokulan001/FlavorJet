export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-[#0f172b] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-8 bg-white/10 rounded-full w-40 animate-pulse" />
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded-full w-1/3 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded-full w-1/4 animate-pulse" />
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
