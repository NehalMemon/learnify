import Link from 'next/link';
import { Star } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-white font-sans text-[#191c1e] antialiased">
      <section className="relative flex h-full w-full items-center justify-center overflow-hidden px-6 py-5 md:w-[45%] lg:w-[40%] lg:px-10">
        <Link href="/" className="absolute left-6 top-5 flex items-center gap-2 md:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3525cd] text-white">
            <Star className="h-4 w-4 fill-current" aria-hidden="true" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-[#3525cd]">Learnify</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-[#191c1e]">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-[#5b5a68]">
              Sign in to continue your learning journey.
            </p>
          </div>

          <LoginForm />
        </div>
      </section>

      <section
        className="relative hidden h-full items-center justify-center overflow-hidden p-12 md:flex md:w-[55%] lg:w-[60%] lg:p-16"
        style={{
          backgroundColor: '#4f46e5',
          backgroundImage:
            'radial-gradient(at 0% 0%, #3525cd 0px, transparent 50%), radial-gradient(at 100% 0%, #6cf8bb 0px, transparent 50%), radial-gradient(at 100% 100%, #4f46e5 0px, transparent 50%), radial-gradient(at 0% 100%, #c3c0ff 0px, transparent 50%)',
        }}
      >
        <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px]" aria-hidden="true" />

        <div className="relative z-10 max-w-lg text-center text-white">
          <Link href="/" className="mb-10 flex items-center justify-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-white shadow-xl backdrop-blur-md">
              <Star className="h-6 w-6 fill-current" aria-hidden="true" />
            </span>
            <span className="text-4xl font-extrabold tracking-tight">Learnify</span>
          </Link>

          <h2 className="text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
            Keep momentum on your side.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-white/85">
            Pick up your courses, review progress insights, and stay connected with your learning ecosystem.
          </p>

          <div className="absolute -bottom-20 left-1/2 flex -translate-x-1/2 gap-5 opacity-20" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-white" />
            <span className="h-3 w-3 rounded-full bg-white" />
            <span className="h-3 w-3 rounded-full bg-white" />
            <span className="h-3 w-3 rounded-full bg-white" />
            <span className="h-3 w-3 rounded-full bg-white" />
          </div>
        </div>
      </section>
    </main>
  );
}
