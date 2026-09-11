import React, { Suspense } from 'react';

export function MemberSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/50 text-sm">
          Yükleniyor...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
