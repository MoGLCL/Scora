import type { Metadata, Viewport } from "next";
import { Cairo, Tajawal, Outfit, JetBrains_Mono } from "next/font/google";
import { ProfileProvider } from "@/components/profile-provider";
import { FloatingChatProvider } from "@/components/floating-chat-provider";
import { FloatingChatContainer } from "@/components/floating-chat-container";
import { AiAssistantSsd } from "@/components/ai-assistant-ssd";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { UserHeartbeat } from "@/components/user-heartbeat";
import { getCurrentClient, getCurrentDeveloper, getCurrentUser, verifySession } from "@/lib/dal";
import { query, queryOne } from "@/lib/db";
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

export const viewport: Viewport = {
  themeColor: "#056B38",
  interactiveWidget: "resizes-visual",
};

export const metadata: Metadata = {
  title: "سكورا — اعرف مين فاهم الكود بجد",
  description:
    "وظّف مبرمجين فاهمين شغلهم، مش بس حافظين كلام. سكورا بيجمع التقييمات، جودة الكود، والإنترفيو في بروفايل واحد.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/icon.svg",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  const user = session ? await getCurrentUser() : null;
  const developer = session?.role === "developer" ? await getCurrentDeveloper() : null;
  const client = session?.role === "client" ? await getCurrentClient() : null;
  const developerSkills = developer ? await query<{ name: string }>(
    `SELECT s.name FROM developer_skills ds JOIN skills s ON s.id = ds.skill_id
     WHERE ds.developer_id = ? ORDER BY ds.sp DESC`,
    [developer.id]
  ) : [];
  const aiSetting = await queryOne<{ setting_value: string | null }>(
    "SELECT setting_value FROM platform_settings WHERE setting_key = 'ai_assistant_enabled'"
  );
  const userAiSetting = session ? await queryOne<{ setting_value: string | null }>(
    "SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = 'ai_assistant_enabled'",
    [session.userId]
  ) : null;
  const initialProfile = {
    role: (session?.role ?? "guest") as "developer" | "client" | "guest",
    developerApprovalStatus: session?.developerApprovalStatus ?? null,
    isAdmin: session?.isAdmin ?? false,
    username: user?.username ?? "",
    isAiAssistantEnabled: aiSetting?.setting_value !== "false",
    showSsdAssistant:
      userAiSetting?.setting_value !== "false" &&
      (session?.role !== "developer" || session?.developerApprovalStatus === "approved"),
    developer: user ? {
      fullName: developer?.display_name || user.full_name || "مطور",
      email: user.email,
      phone: developer?.phone ?? user.phone ?? "",
      jobTitle: developer?.job_title ?? "",
      location: developer?.location ?? "",
      bio: developer?.bio ?? "",
      trustScore: developer?.trust_score ?? 50,
      skillPoints: developer?.skill_points ?? 0,
      github: developer?.github_url ?? "",
      linkedin: developer?.linkedin_url ?? "",
      website: developer?.portfolio_url ?? "",
      availability: developer?.availability === "busy" ? ("busy" as const) : ("available" as const),
      avatarUrl: developer?.avatar_url ?? null,
      isVerified: Boolean(developer?.is_verified || user.is_verified),
      skills: developerSkills.map((skill) => skill.name),
    } : undefined,
    client: user ? {
      accountType: client?.account_type ?? "personal",
      fullName: client?.display_name || user.full_name || "عميل",
      email: user.email,
      phone: client?.phone ?? user.phone ?? "",
      companyName: client?.company_name ?? "",
      industry: client?.industry ?? "",
      location: client?.location ?? "",
      website: client?.website ?? "",
      avatarUrl: client?.avatar_url ?? null,
      isVerified: Boolean(client?.is_verified || user.is_verified),
    } : undefined,
  };
  return (
    <html
      suppressHydrationWarning
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${tajawal.variable} ${outfit.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <ProfileProvider key={`${session?.userId ?? "guest"}:${session?.isAdmin ?? false}`} initialProfile={initialProfile}>
          <FloatingChatProvider>
            {children}
            <FloatingChatContainer />
            <AiAssistantSsd />
            <AnalyticsTracker />
            <UserHeartbeat />
          </FloatingChatProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}

