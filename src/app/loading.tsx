export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0b1120]">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-slate-600" />
          <div className="absolute inset-0 rounded-full border-4 border-[#fea116] border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-500 dark:text-slate-400 font-medium">Loading...</p>
      </div>
    </div>
  );
}
