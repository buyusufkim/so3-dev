import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { memberApiClient, MemberApiError } from '../api/client';

export function MemberLoginPage() {
  const { identity, isLoading, refreshIdentity } = useMemberAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect
  if (!isLoading && identity) {
    if (identity.account.must_change_password) {
      return <Navigate to="/uye/sifre-degistir" replace />;
    }
    return <Navigate to="/uye" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await memberApiClient.login(username.trim(), password);
      await refreshIdentity();
      // the effect of refreshIdentity will cause identity to become non-null, triggering the redirect above on next render
    } catch (err) {
      if (err instanceof MemberApiError) {
        if (err.status === 401) {
          setError('Kullanıcı adı veya şifre hatalı.');
        } else if (err.status === 429) {
          setError(err.message || 'Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin.');
        } else if (err.status === 422) {
          setError(err.message);
        } else {
          setError('Şu anda giriş yapılamıyor. Lütfen tekrar deneyin.');
        }
      } else {
        setError('Şu anda giriş yapılamıyor. Lütfen tekrar deneyin.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto mt-12 sm:mt-24">
      <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white mb-2">Üye Girişi</h1>
          <p className="text-sm text-white/50">
            Antrenmanlarına ve seans bilgilerine eriş.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70 block" htmlFor="username">
              Kullanıcı adı
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#851C35] focus:ring-1 focus:ring-[#851C35] transition-all disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70 block" htmlFor="password">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#851C35] focus:ring-1 focus:ring-[#851C35] transition-all disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username.trim() || !password}
            className="w-full bg-[#851C35] text-white font-medium py-3 rounded-xl hover:bg-[#6b162a] active:bg-[#531121] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
