'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';

export default function AuthCallbackPage() {
  const router = useRouter();
  const setUser = useAuthStore(s => s.setUser);

  useEffect(() => {
    // supabase detects the code/hash in the URL and exchanges it for a session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);

        // Create profile if first login via VocabLens Web
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (!existingProfile) {
          await supabase.from('profiles').insert({
            id: session.user.id,
            display_name: session.user.email?.split('@')[0],
            invite_code: 'vocablens-web',
          });
        }

        router.replace('/');
      } else {
        router.replace('/login?error=auth');
      }
    });
  }, [router, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <p className="text-sm text-gray-400">ログイン中...</p>
    </div>
  );
}
