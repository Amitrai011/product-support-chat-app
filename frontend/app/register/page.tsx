'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../lib/auth-context';
import type { Role } from '../../lib/types';

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('customer');
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
      const u = await register({ name, email, password, role });
      router.replace(u.role === 'agent' ? '/agent' : '/customer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Logo />
        </div>
        <p className="lux-eyebrow mb-2">Join Luxe</p>
        <h2 className="lux-heading mb-8 text-3xl text-ivory">Create account</h2>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted">Full name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="lux-input"
              placeholder="Olivia Chen"
            />
          </div>
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="lux-input"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted">I am a…</label>
            <div className="grid grid-cols-2 gap-2">
              {(['customer', 'agent'] as Role[]).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className="lux-btn px-3 py-2.5 text-sm capitalize"
                  style={
                    role === r
                      ? {
                          background:
                            'linear-gradient(180deg, var(--color-gold-soft), var(--color-gold))',
                          color: '#1c150b',
                        }
                      : {
                          border: '1px solid var(--color-hair)',
                          color: 'var(--color-ivory)',
                        }
                  }
                >
                  {r === 'customer' ? 'Customer' : 'Support Agent'}
                </button>
              ))}
            </div>
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
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-gold-soft hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
