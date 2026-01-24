// Skeleton loader for profile page
export default function ProfileLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-700" />
        <div>
          <div className="h-7 w-40 bg-gray-700 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-800 rounded" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-3">
        <div className="h-10 w-24 bg-gray-700 rounded-lg" />
        <div className="h-10 w-24 bg-gray-800 rounded-lg" />
        <div className="h-10 w-28 bg-gray-800 rounded-lg" />
      </div>

      {/* Form section */}
      <div className="card">
        <div className="space-y-4">
          {/* Field 1 */}
          <div>
            <div className="h-4 w-24 bg-gray-700 rounded mb-2" />
            <div className="h-10 w-full bg-gray-800 rounded-lg" />
          </div>
          {/* Field 2 */}
          <div>
            <div className="h-4 w-20 bg-gray-700 rounded mb-2" />
            <div className="h-10 w-full bg-gray-800 rounded-lg" />
          </div>
          {/* Field 3 */}
          <div>
            <div className="h-4 w-28 bg-gray-700 rounded mb-2" />
            <div className="h-24 w-full bg-gray-800 rounded-lg" />
          </div>
          {/* Save button */}
          <div className="h-10 w-32 bg-mtg-green-600/30 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
