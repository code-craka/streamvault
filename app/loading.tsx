export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-400 border-t-transparent"></div>
        <h2 className="mb-2 text-xl font-semibold text-white">
          Loading StreamVault
        </h2>
        <p className="text-gray-300">
          Please wait while we prepare your experience...
        </p>
      </div>
    </div>
  )
}
