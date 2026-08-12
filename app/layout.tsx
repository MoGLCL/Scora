import type { Metadata } from "next";
import { Cairo, Tajawal, Outfit, JetBrains_Mono } from "next/font/google";
import { ProfileProvider } from "@/components/profile-provider";
import { AiAssistantSsd } from "@/components/ai-assistant-ssd";
import { MobileBottomTabs } from "@/components/mobile-bottom-tabs";
import { RealtimeSync } from "@/components/realtime-sync";
import { getCurrentClient, getCurrentDeveloper, getCurrentUser, verifySession } from "@/lib/dal";
import { queryOne } from "@/lib/db";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "سكورا — اعرف مين فاهم الكود بجد",
  description:
    "وظّف مبرمجين فاهمين شغلهم، مش بس حافظين كلام. سكورا بيجمع التقييمات، جودة الكود، والإنترفيو في بروفايل واحد.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  const user = session ? await getCurrentUser() : null;
  const developer = session?.role === "developer" ? await getCurrentDeveloper() : null;
  const client = session?.role === "client" ? await getCurrentClient() : null;
  const aiSetting = await queryOne<{ setting_value: string | null }>(
    "SELECT setting_value FROM platform_settings WHERE setting_key = 'ai_assistant_enabled'"
  );
  const initialProfile = {
    role: session?.role ?? "guest" as const,
    isAiAssistantEnabled: aiSetting?.setting_value !== "false",
    developer: developer && user ? {
      fullName: developer.display_name, email: user.email, phone: developer.phone ?? user.phone ?? "",
      jobTitle: developer.job_title ?? "", location: developer.location ?? "", bio: developer.bio ?? "",
      trustScore: developer.trust_score, skillPoints: developer.skill_points,
      github: developer.github_url ?? "", linkedin: developer.linkedin_url ?? "", website: developer.portfolio_url ?? "",
      availability: developer.availability === "busy" ? "busy" as const : "available" as const,
    } : undefined,
    client: client && user ? {
      fullName: client.display_name, email: user.email, phone: client.phone ?? user.phone ?? "",
      companyName: client.company_name ?? "", location: client.location ?? "", website: client.website ?? "",
    } : undefined,
  };
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${tajawal.variable} ${outfit.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col pb-20 lg:pb-0">
        <ProfileProvider initialProfile={initialProfile}>
          {children}
          <AiAssistantSsd />
          <MobileBottomTabs />
          <RealtimeSync enabled={Boolean(session)} />
        </ProfileProvider>
      </body>
    </html>
  );
}
