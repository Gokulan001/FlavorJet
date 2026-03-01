export default function ItemLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb Skeleton */}
      <div className="bg-[#f8f9fa] border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="h-4 bg-gray-200 rounded-full w-48 animate-pulse" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Skeleton */}
          <div className="h-80 sm:h-96 lg:h-[500px] bg-gray-200 rounded-3xl animate-pulse" />

          {/* Details Skeleton */}
          <div className="space-y-6">
            <div className="h-4 bg-gray-100 rounded-full w-32 animate-pulse" />
            <div className="h-10 bg-gray-200 rounded-full w-3/4 animate-pulse" />
            <div className="flex gap-3">
              <div className="h-8 bg-gray-100 rounded-full w-16 animate-pulse" />
              <div className="h-8 bg-gray-100 rounded-full w-24 animate-pulse" />
              <div className="h-8 bg-gray-100 rounded-full w-20 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded-full w-full animate-pulse" />
              <div className="h-4 bg-gray-100 rounded-full w-5/6 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded-full w-2/3 animate-pulse" />
            </div>
            <div className="h-10 bg-gray-200 rounded-full w-24 animate-pulse" />
            <div className="h-14 bg-gray-200 rounded-2xl w-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
