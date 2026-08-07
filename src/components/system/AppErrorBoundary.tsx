import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-brand-black p-6 text-center text-brand-off-white">
          <h1 className="font-display text-4xl font-bold uppercase tracking-tighter sm:text-5xl">
            Sistem <span className="text-brand-metallic">Hatası</span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-brand-metallic">
            Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya ana sayfaya dönerek tekrar deneyin.
          </p>
          <div className="mt-8 flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            <Button onClick={() => window.location.reload()} size="lg">
              Sayfayı Yenile
            </Button>
            <Button onClick={() => (window.location.href = "/")} size="lg" variant="outline">
              Ana Sayfaya Dön
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
