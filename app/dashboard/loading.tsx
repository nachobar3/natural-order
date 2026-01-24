// Skeleton loader for dashboard - shows immediately while page loads
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Setup checklist skeleton */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-700" />
            <div>
              <div className="h-5 w-40 bg-gray-700 rounded mb-2" />
              <div className="h-3 w-32 bg-gray-800 rounded" />
            </div>
          </div>
          <div className="h-4 w-20 bg-gray-700 rounded" />
        </div>
      </div>

      {/* Trades section skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 bg-gray-700 rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-gray-800 rounded-lg" />
            <div className="h-8 w-8 bg-gray-800 rounded-lg" />
          </div>
        </div>

        {/* Filter pills skeleton */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-800/50 rounded-lg p-1">
            <div className="h-8 w-28 bg-gray-700 rounded-md" />
            <div className="h-8 w-24 bg-gray-800 rounded-md ml-1" />
          </div>
          <div className="h-8 w-10 bg-gray-800 rounded-lg" />
        </div>

        {/* Match cards skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="card">
            {/* Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-mtg-green-900/30">
              <div className="w-10 h-10 rounded-full bg-gray-700" />
              <div className="flex-1">
                <div className="h-5 w-32 bg-gray-700 rounded mb-2" />
                <div className="h-3 w-20 bg-gray-800 rounded" />
              </div>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 gap-4 py-3">
              <div>
                <div className="h-4 w-20 bg-gray-700 rounded mb-2" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-800 rounded" />
                  <div className="h-4 w-3/4 bg-gray-800 rounded" />
                </div>
              </div>
              <div>
                <div className="h-4 w-20 bg-gray-700 rounded mb-2" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-800 rounded" />
                  <div className="h-4 w-2/3 bg-gray-800 rounded" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-mtg-green-900/30">
              <div className="h-4 w-24 bg-gray-800 rounded" />
              <div className="h-8 w-28 bg-mtg-green-600/30 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
