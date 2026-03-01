export default function MenuLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Banner Skeleton */}
      <div className="h-64 sm:h-80 bg-[#0f172b] animate-pulse" />

      {/* Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden shadow-sm">
              <div className="h-56 bg-gray-200 animate-pulse" />
              <div className="p-6">
                <div className="h-5 bg-gray-200 rounded-full w-2/3 mb-2 animate-pulse" />
                <div className="h-4 bg-gray-100 rounded-full w-1/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
