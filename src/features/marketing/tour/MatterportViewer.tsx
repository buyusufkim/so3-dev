import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/features/site-settings/PublicSiteSettingsProvider";

interface MatterportViewerProps {
  className?: string;
}

export function MatterportViewer({ className }: MatterportViewerProps) {
  const { settings, loading } = useSiteSettings();
  const modelId = settings?.tour?.matterport_model_id;

  if (loading) {
    return (
      <div className={cn("relative w-full bg-[#0F0F0F] overflow-hidden border border-white/10 shadow-2xl rounded-lg flex items-center justify-center animate-pulse", className)}>
        <span className="text-white/50 text-sm font-medium">Sanal tur yükleniyor...</span>
      </div>
    );
  }

  if (!modelId) {
    return (
      <div className={cn("relative w-full bg-[#0F0F0F] overflow-hidden border border-white/10 shadow-2xl rounded-lg flex items-center justify-center", className)}>
        <span className="text-white/50 text-sm font-medium">Sanal tur şu an kullanılamıyor.</span>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full bg-[#0F0F0F] overflow-hidden border border-white/10 shadow-2xl rounded-lg", className)}>
      <iframe
        src={`https://my.matterport.com/show/?m=${modelId}`}
        className="absolute inset-0 w-full h-full border-0"
        allowFullScreen
        allow="fullscreen"
        loading="lazy"
        title="SO3 PT 360 derece sanal tur"
      ></iframe>
    </div>
  );
}
