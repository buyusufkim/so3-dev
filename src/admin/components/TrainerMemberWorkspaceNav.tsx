import { Link } from "react-router-dom";
import { User, Activity, Dumbbell } from "lucide-react";

export type WorkspaceTab = "member" | "progress" | "programs";

interface TrainerMemberWorkspaceNavProps {
  memberId: number | string | undefined;
  active: WorkspaceTab;
}

export function TrainerMemberWorkspaceNav({ memberId, active }: TrainerMemberWorkspaceNavProps) {
  const tabs = [
    {
      id: "member" as const,
      label: "Üye Bilgileri",
      to: `/admin/my-members/${memberId}`,
      icon: User,
    },
    {
      id: "progress" as const,
      label: "Gelişim Takibi",
      to: `/admin/my-members/${memberId}/progress`,
      icon: Activity,
    },
    {
      id: "programs" as const,
      label: "Antrenman Programları",
      to: `/admin/my-members/${memberId}/training-programs`,
      icon: Dumbbell,
    },
  ];

  return (
    <nav
      aria-label="Üye Çalışma Alanı Navigasyonu"
      className="bg-[#121212] border border-white/10 rounded-xl p-1.5 flex flex-wrap items-center gap-1.5"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            to={tab.to}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
              isActive
                ? "bg-[#851C35] text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#851C35]/50"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
