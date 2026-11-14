import { LocalizedText } from '@/components/ui/LocalizedText';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { AppIcon } from '@/components/layout/AppIcon';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setGlobalError(null);
    try {
      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      const { user, accessToken, refreshToken } = response.data;
      const permissions = response.data.permissions ?? user?.permissions ?? [];
      login(user, permissions, accessToken, refreshToken);

      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        const responseMessage = err.response?.data?.message;

        if (status === 423) {
          setGlobalError(
            responseMessage ||
              'Account is locked due to repeated failed login attempts. Please try again later.',
          );
        } else if (status === 429) {
          setGlobalError(
            'Too many attempts. Please wait a moment before trying again.',
          );
        } else if (status === 401) {
          setGlobalError('Invalid email or password.');
        } else {
          setGlobalError('An unexpected error occurred. Please try again.');
        }
      } else {
        setGlobalError('Network error. Please check your connection.');
      }
    }
  };

  return (
    <main className="login-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-8 lg:px-12">
      <div aria-hidden="true" className="login-orb login-orb-one" />
      <div aria-hidden="true" className="login-orb login-orb-two" />

      <div className="login-toolbar absolute right-4 top-2 z-10 flex items-center gap-2 sm:right-7 sm:top-5">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="login-layout relative z-[1] grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
        <section className="login-intro hidden lg:block">
          <div className="login-brand-mark mb-8 grid h-16 w-16 place-items-center rounded-[20px] text-white shadow-xl">
            <AppIcon name="layers" className="h-8 w-8" />
          </div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[.24em] text-cyan-700">
            <LocalizedText text="Import operations" />
          </p>
          <h1 className="max-w-xl text-5xl font-bold leading-[1.08] tracking-[-.045em] text-slate-950 xl:text-[58px]">
            <LocalizedText text="Cost Buildup System" />
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
            <LocalizedText text="Welcome" />
          </p>

          <div className="login-flow mt-12 max-w-xl rounded-3xl border border-white/70 bg-white/70 p-5 shadow-xl shadow-slate-900/[.04] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">
                <LocalizedText text="Import operations" />
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                ['PO', 'Purchase Orders'],
                ['LC', 'Letters of Credit'],
                ['LC', 'Landed Cost'],
                ['GRN', 'Inventory'],
              ].map(([code, label], index) => (
                <div key={`${code}-${label}`} className="login-flow-step">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-sky-100 text-[10px] font-extrabold text-sky-800">
                      {code}
                    </span>
                    {index < 3 && (
                      <span className="hidden h-px flex-1 bg-slate-200 xl:block" />
                    )}
                  </div>
                  <p className="mt-3 text-[11px] font-semibold leading-4 text-slate-600">
                    <LocalizedText text={label} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="login-panel mx-auto w-full max-w-[480px]">
          <div className="mb-6 text-center lg:hidden">
            <div className="login-brand-mark mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg">
              <AppIcon name="layers" className="h-6 w-6" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-700">
              <LocalizedText text="Import operations" />
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              <LocalizedText text="Cost Buildup System" />
            </h1>
          </div>

          <div className="login-card p-6 sm:p-9">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-700">
                <LocalizedText text="Welcome" />
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-.03em] text-slate-950 sm:text-[28px]">
                <LocalizedText text="Sign in to your account" />
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                <LocalizedText text="Cost Buildup System" />
              </p>
            </div>

          {globalError && (
            <div role="alert" className="login-error mb-5 flex gap-3 rounded-xl p-4">
              <AppIcon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold">{globalError}</h3>
              </div>
            </div>
          )}

          <form className="login-form space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="login-field">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700"
              >
                <LocalizedText
                  text={'\n                Email address\n              '}
                />
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={`login-input block min-h-12 w-full rounded-xl border px-4 py-3 text-sm transition focus:outline-none focus:ring-4 ${
                    errors.email ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-sky-600 focus:ring-sky-100'
                  }`}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600" id="email-error">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="login-field">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700"
              >
                <LocalizedText
                  text={'\n                Password\n              '}
                />
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={`login-input block min-h-12 w-full rounded-xl border px-4 py-3 text-sm transition focus:outline-none focus:ring-4 ${
                    errors.password ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-sky-600 focus:ring-sky-100'
                  }`}
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600" id="password-error">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="login-submit group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition focus:outline-none focus:ring-4 focus:ring-sky-300/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <LocalizedText
                      text={
                        '\n                    Signing in...\n                  '
                      }
                    />
                  </>
                ) : (
                  'Sign in'
                )}
                {!isSubmitting && <AppIcon name="arrow-right" className="h-4 w-4 transition group-hover:translate-x-1" />}
              </button>
            </div>
          </form>
          </div>
          <p className="mt-5 text-center text-xs text-slate-500">
            <LocalizedText text="Cost Buildup System" />
          </p>
        </section>
      </div>
    </main>
  );
}
