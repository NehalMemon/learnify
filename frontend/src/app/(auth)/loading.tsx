/**
 * Boneyard — Auth route-level skeleton.
 *
 * Provides a clean pulsing structural skeleton during transitions between
 * login, registration, and password reset routes.
 */

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-4 animate-pulse">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* Header / Logo placeholder */}
        <div className="flex flex-col items-center space-y-3">
          <div className="h-10 w-10 rounded-xl bg-purple-100" />
          <div className="h-6 w-40 rounded bg-gray-200" />
          <div className="h-4 w-56 rounded bg-gray-100" />
        </div>

        {/* Input field placeholders */}
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-11 w-full rounded-lg bg-gray-100" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-11 w-full rounded-lg bg-gray-100" />
          </div>
          <div className="h-11 w-full rounded-lg bg-purple-200 pt-2" />
        </div>

        {/* Footer text placeholder */}
        <div className="pt-2 flex justify-center">
          <div className="h-4 w-48 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
