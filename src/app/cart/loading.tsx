export default function CartLoading() {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-[#0f172b] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-8 bg-white/10 rounded-full w-40 animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl">
                <div className="w-24 h-24 bg-gray-200 rounded-xl animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-gray-200 rounded-full w-1/2 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/3 animate-pulse" />
                  <div className="h-8 bg-gray-100 rounded-xl w-24 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-6 h-64 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
