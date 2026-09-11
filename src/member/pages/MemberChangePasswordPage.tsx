import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMemberAuth } from '../auth/MemberAuthContext';
import { memberApiClient, MemberApiError } from '../api/client';

export function MemberChangePasswordPage() {
  const { identity, isLoading, refreshIdentity } = useMemberAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && !identity) {
    return <Navigate to="/uye/giris" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) return;

    if (newPassword.length < 12) {
      setError('Yeni şifre en az 12 karakter olmalıdır.');
      return;
    }
    if (newPassword.length > 256) {
      setError('Yeni şifre çok uzun.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Yeni şifre mevcut şifre ile aynı olamaz.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Yeni şifreler eşleşmiyor.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await memberApiClient.changePassword(currentPassword, newPassword);
      const freshIdentity = await refreshIdentity();
      
      if (freshIdentity) {
        if (!freshIdentity.account.must_change_password) {
          navigate('/uye', { replace: true });
        } else {
          setError('Şifre değiştirildi ancak hesabınızın durumu güncellenemedi.');
          setIsSubmitting(false);
        }
      } else {
        setError('Oturum bilgileri güncellenemedi.');
        setIsSubmitting(false);
      }
    } catch (err) {
      if (err instanceof MemberApiError) {
        if (err.code === 'INVALID_CREDENTIALS') {
          setError('Mevcut şifre yanlış.');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          setError(err.message || 'Şifre değiştirilirken bir hata oluştu.');
        }
      } else {
        setError('Şifre değiştirilirken bir hata oluştu.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-8 sm:mt-12">
      {identity?.account.must_change_password && (
        <div className="mb-6 bg-[#851C35]/10 border border-[#851C35]/20 text-[#851C35] px-4 py-3 rounded-xl text-sm font-medium">
          Devam etmek için geçici şifrenizi değiştirmeniz gerekiyor.
        </div>
      )}

      <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white mb-1">Şifre Değiştir</h1>
          <p className="text-sm text-white/50">
            Hesabınızın güvenliği için yeni bir şifre belirleyin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70 block" htmlFor="current">
              Mevcut şifre
            </label>
            <input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#851C35] focus:ring-1 focus:ring-[#851C35] transition-all disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70 block" htmlFor="new">
              Yeni şifre
            </label>
            <input
              id="new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#851C35] focus:ring-1 focus:ring-[#851C35] transition-all disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70 block" htmlFor="confirm">
              Yeni şifre tekrar
            </label>
            <input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#851C35] focus:ring-1 focus:ring-[#851C35] transition-all disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
            className="w-full bg-[#851C35] text-white font-medium py-3 rounded-xl hover:bg-[#6b162a] active:bg-[#531121] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {isSubmitting ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
          </button>
        </form>
      </div>
    </div>
  );
}
