'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../lib/auth-context';

const DEMO = [
  { label: 'Agent · Isabella', email: 'agent@luxe.com', role: 'agent' },
  { label: 'Customer · Olivia', email: 'customer@luxe.com', role: 'customer' },
  { label: 'Customer · James', email: 'customer2@luxe.com', role: 'customer' },
];

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === 'agent' ? '/agent' : '/customer');
    }
  }, [user, loading, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const u = await login(email, password);
      router.replace(u.role === 'agent' ? '/agent' : '/customer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('password123');
  }

  return (
    <main className="flex flex-1">
      {/* Decorative panel */}
      <aside className="relative hidden w-1/2 overflow-hidden lg:block">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(12,11,10,0.55), rgba(12,11,10,0.92))',
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo />
          <div className="max-w-md">
            <p className="lux-eyebrow mb-4">Concierge Support</p>
            <h1 className="lux-heading text-4xl leading-tight text-ivory">
              Every detail attended to, in real time.
            </h1>
            <p className="mt-4 text-muted">
              Speak directly with a dedicated agent about any piece in our
              collection — a separate, private thread for each.
            </p>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <p className="lux-eyebrow mb-2">Welcome back</p>
          <h2 className="lux-heading mb-8 text-3xl text-ivory">Sign in</h2>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-muted">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="lux-input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-muted">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="lux-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="lux-btn lux-btn-gold w-full py-3"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-widest text-faint">
              Demo accounts · password123
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  onClick={() => fillDemo(d.email)}
                  className="lux-btn lux-btn-ghost px-3 py-1.5 text-xs"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-8 text-sm text-muted">
            New here?{' '}
            <Link href="/register" className="text-gold-soft hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
