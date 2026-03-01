export default function CategoryLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Banner Skeleton */}
      <div className="h-64 sm:h-72 bg-[#0f172b] animate-pulse" />

      {/* Items Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-12 bg-gray-100 rounded-xl w-64 mb-8 animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden">
              <div className="h-48 bg-gray-200 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-200 rounded-full w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded-full w-full animate-pulse" />
                <div className="h-3 bg-gray-100 rounded-full w-2/3 animate-pulse" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse" />
                  <div className="h-9 bg-gray-200 rounded-xl w-20 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
