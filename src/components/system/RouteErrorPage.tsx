import { useRouteError, Link } from "react-router-dom";
import { Header } from "../layout/Header";
import { Footer } from "../layout/Footer";

export function RouteErrorPage() {
  const error = useRouteError();

  // We intentionally do not show raw stack traces or internal router details to the end-user.
  // We just log it for debugging if needed (though not strictly required per spec).
  console.error(error);

  return (
    <div className="flex min-h-screen flex-col bg-brand-black text-brand-off-white selection:bg-brand-off-white selection:text-brand-black">
      <Header />
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center bg-[#F4F1EB] text-[#0A0A0A]">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Beklenmeyen bir hata oluştu.
          </h1>
          <p className="text-lg md:text-xl text-[#0A0A0A]/70 mb-8 max-w-lg mx-auto">
            İşleminiz sırasında bir sorunla karşılaştık. Lütfen sayfayı yenilemeyi deneyin veya ana sayfaya dönün.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#0A0A0A] text-white rounded font-bold uppercase tracking-wider text-sm hover:bg-[#851C35] transition-colors"
            >
              Sayfayı Yenile
            </button>
            
            <Link 
              to="/"
              className="px-6 py-3 bg-transparent border border-[#0A0A0A] text-[#0A0A0A] rounded font-bold uppercase tracking-wider text-sm hover:bg-black/5 transition-colors"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
