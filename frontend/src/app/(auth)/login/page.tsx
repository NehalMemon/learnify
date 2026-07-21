import Link from 'next/link';
import { loginWithEmail } from '@/app/actions/authActions';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          {/* SVG Logo placeholder */}
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or <Link href="/register" className="font-medium text-purple-600 hover:text-purple-700">create a new account</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form action={loginWithEmail} method="post" className="space-y-6" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500" placeholder="********" />
          </div>
          <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
