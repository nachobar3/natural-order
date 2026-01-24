// Skeleton loader for match detail page
export default function MatchDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back button */}
      <div className="h-5 w-24 bg-gray-800 rounded" />

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 bg-gray-700 rounded" />
              <div className="h-3 w-16 bg-gray-800 rounded" />
            </div>
            <div className="h-7 w-20 bg-gray-700 rounded" />
          </div>
        ))}
      </div>

      {/* User header card */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-700" />
          <div className="flex-1">
            <div className="h-6 w-36 bg-gray-700 rounded mb-2" />
            <div className="h-4 w-24 bg-gray-800 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-10 bg-gray-800 rounded-lg" />
            <div className="h-10 w-10 bg-gray-800 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Cards sections */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Cards I want */}
        <div className="card">
          <div className="flex items-center justify-between pb-3 border-b border-mtg-green-900/30">
            <div className="h-5 w-32 bg-gray-700 rounded" />
            <div className="h-4 w-16 bg-gray-800 rounded" />
          </div>
          <div className="py-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-16 bg-gray-800 rounded" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-700 rounded mb-1" />
                  <div className="h-3 w-20 bg-gray-800 rounded" />
                </div>
                <div className="h-5 w-16 bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Cards they want */}
        <div className="card">
          <div className="flex items-center justify-between pb-3 border-b border-mtg-green-900/30">
            <div className="h-5 w-32 bg-gray-700 rounded" />
            <div className="h-4 w-16 bg-gray-800 rounded" />
          </div>
          <div className="py-4 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-16 bg-gray-800 rounded" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-700 rounded mb-1" />
                  <div className="h-3 w-20 bg-gray-800 rounded" />
                </div>
                <div className="h-5 w-16 bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <div className="h-12 flex-1 bg-gray-800 rounded-lg" />
        <div className="h-12 flex-1 bg-mtg-green-600/30 rounded-lg" />
      </div>
    </div>
  )
}
