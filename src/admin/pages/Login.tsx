import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiClient.post('/api/auth/login', { username, password });
      apiClient.clearAuth();
      navigate('/admin');
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Giriş bilgileri geçersiz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#121212] border border-white/10 p-8 rounded-lg shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <img src="/brand/so3-logo.png" alt="SO3 PT" className="h-12 mb-4" />
          <h1 className="text-xl font-bold tracking-widest text-white text-center uppercase">
            SO3 <span className="text-[#851C35]">CONTROL</span>
          </h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wide">
              E-posta / Kullanıcı Adı
            </label>
            <input 
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-[#851C35] transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wide">
              Şifre
            </label>
            <input 
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-[#851C35] transition"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#851C35] hover:bg-[#6c162b] text-white font-medium py-3 rounded transition flex justify-center items-center mt-2 disabled:opacity-50"
          >
            {loading ? 'Bekleyin...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
