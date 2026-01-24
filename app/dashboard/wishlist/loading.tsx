// Skeleton loader for wishlist page
export default function WishlistLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-700 rounded-lg" />
          <div>
            <div className="h-7 w-28 bg-gray-700 rounded mb-1" />
            <div className="h-4 w-20 bg-gray-800 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-gray-800 rounded-lg" />
          <div className="h-10 w-10 bg-gray-800 rounded-lg" />
          <div className="h-10 w-10 bg-gray-800 rounded-lg" />
        </div>
      </div>

      {/* Search bar */}
      <div className="h-12 w-full bg-gray-800 rounded-lg" />

      {/* Binder grid skeleton */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="aspect-[2.5/3.5] bg-gray-800 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
