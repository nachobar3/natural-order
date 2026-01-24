// Skeleton loader for notifications page
export default function NotificationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-36 bg-gray-700 rounded" />
        <div className="h-8 w-28 bg-gray-800 rounded-lg" />
      </div>

      {/* Notification list */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-5 w-48 bg-gray-700 rounded mb-2" />
                <div className="h-4 w-full bg-gray-800 rounded mb-1" />
                <div className="h-4 w-2/3 bg-gray-800 rounded" />
                <div className="h-3 w-24 bg-gray-800 rounded mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
