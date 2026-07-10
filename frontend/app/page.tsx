'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '../components/Logo';
import { useAuth } from '../lib/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else router.replace(user.role === 'agent' ? '/agent' : '/customer');
  }, [user, loading, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6">
      <Logo />
      <p className="lux-eyebrow animate-pulse">Preparing your concierge…</p>
    </main>
  );
}
