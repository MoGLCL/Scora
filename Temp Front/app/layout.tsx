import type { Metadata } from "next";
import { Cairo, Tajawal, Outfit, JetBrains_Mono } from "next/font/google";
import { ProfileProvider } from "@/components/profile-provider";
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${tajawal.variable} ${outfit.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <ProfileProvider>{children}</ProfileProvider>
      </body>
    </html>
  );
}
