import { CommunityHero } from "../../features/marketing/community/CommunityHero";
import { CommunityIntro } from "../../features/marketing/community/CommunityIntro";
import { CommunityMoments } from "../../features/marketing/community/CommunityMoments";
import { CommunityCulture } from "../../features/marketing/community/CommunityCulture";
import { CommunityEventsLink } from "../../features/marketing/community/CommunityEventsLink";
import { CommunityCta } from "../../features/marketing/community/CommunityCta";

export function CommunityPage() {
  return (
    <main className="w-full flex flex-col min-h-screen bg-[#050505]">
      <CommunityHero />
      <CommunityIntro />
      <CommunityMoments />
      <CommunityCulture />
      <CommunityEventsLink />
      <CommunityCta />
    </main>
  );
}
