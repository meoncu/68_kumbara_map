'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthState } from '@/hooks/useAuthState';
import { useUserRole } from '@/hooks/useUserRole';

function normalizeRedirect(v: string | null) {
  if (!v) return null;
  if (!v.startsWith('/')) return null;
  if (v.startsWith('//')) return null;
  return v;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useMemo(() => normalizeRedirect(searchParams.get('redirect')), [searchParams]);

  const { user, loading: authLoading } = useAuthState();
  const { role, loading: roleLoading, ekipId } = useUserRole(user?.email);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await getRedirectResult(auth);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Google giriş yönlendirmesi tamamlanamadı');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) return;

    if (role === 'admin') {
      router.replace(redirectTo || '/');
      return;
    }

    if (role === 'team') {
      router.replace(redirectTo || '/ekip');
      return;
    }

    setError('Bu e-posta için yetki tanımlı değil. Yöneticiye bildirin.');
  }, [authLoading, roleLoading, user, role, router, redirectTo]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white text-xl font-black">
              K
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Hesabına Giriş Yap</h1>
            <p className="mt-1 text-sm text-slate-500">Google ile veya e-posta/şifre ile giriş yap.</p>
          </div>

          {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
          {info && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{info}</div>}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              disabled={busy || authLoading || roleLoading}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setInfo(null);
                try {
                  const provider = new GoogleAuthProvider();
                  provider.setCustomParameters({ prompt: 'select_account' });
                  try {
                    await signInWithPopup(auth, provider);
                  } catch (e: any) {
                    const code = e?.code as string | undefined;
                    if (
                      code === 'auth/popup-blocked' ||
                      code === 'auth/popup-closed-by-user' ||
                      code === 'auth/operation-not-supported-in-this-environment'
                    ) {
                      await signInWithRedirect(auth, provider);
                      return;
                    }
                    throw e;
                  }
                } catch (e: any) {
                  setError(e?.message || 'Google ile giriş başarısız');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-indigo-600 font-black">G</span>
              Google ile Devam Et
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white opacity-60"
              disabled
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-black font-black"></span>
              Apple ile Devam Et
            </button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <div className="text-xs font-semibold text-slate-400">veya</div>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              setInfo(null);
              try {
                await signInWithEmailAndPassword(auth, email.trim(), password);
              } catch (e: any) {
                setError(e?.message || 'Giriş başarısız');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ornek@mail.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Şifre</label>
              <div className="relative mt-1">
                <input
                  type={sifreGorunur ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setSifreGorunur((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  {sifreGorunur ? 'Gizle' : 'Göster'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
              disabled={busy || authLoading || roleLoading}
            >
              {busy ? 'Giriş yapılıyor...' : 'Hesabına Giriş Yap'}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              disabled={busy || !email.trim()}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setInfo(null);
                try {
                  await sendPasswordResetEmail(auth, email.trim());
                  setInfo('Şifre sıfırlama e-postası gönderildi.');
                } catch (e: any) {
                  setError(e?.message || 'Şifre sıfırlama e-postası gönderilemedi');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Şifremi Unuttum
            </button>

            <div className="text-xs text-slate-400">
              {authLoading ? 'Kontrol ediliyor...' : user ? `Giriş yapıldı: ${user.email || ''}` : 'Giriş yapılmadı'}
            </div>
          </div>

          {role === 'team' && ekipId && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Ekip erişimi tanımlı.
            </div>
          )}

          {user && (
            <div className="mt-6">
              <button
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  setInfo(null);
                  try {
                    await signOut(auth);
                  } catch (e: any) {
                    setError(e?.message || 'Çıkış yapılamadı');
                  } finally {
                    setBusy(false);
                  }
                }}
                className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                disabled={busy}
              >
                Çıkış
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <div className="mx-auto max-w-md px-4 py-10">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-700">Giriş sayfası yükleniyor...</div>
            </div>
          </div>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
