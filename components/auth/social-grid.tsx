"use client";

import React from "react";
import { useProfile } from "@/components/profile-provider";
import {
  DiscordIcon,
  FacebookIcon,
  GoogleIcon,
  GithubIcon,
  XIcon,
  LinkedinIcon,
} from "./social-icons";

interface SocialGridProps {
  label?: string;
}

export function SocialGrid({ label = "أو التسجيل السريع بواسطة" }: SocialGridProps) {
  const { systemSettings, addToast } = useProfile();

  const handleSocialClick = (name: string, enabled: boolean) => {
    if (!enabled) {
      addToast(`طريقة التسجيل السريع بـ [${name}] معطلة من قبل إدارة المنصة مؤقتاً`, "warn");
      return;
    }
    addToast(`جاري توجيهك إلى تسجيل الدخول السريع عبر ${name}...`, "info");
  };

  return (
    <div className="w-full mt-6 mb-6">
      {/* Divider */}
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-full border-t border-neutral-200/80"></div>
        <span className="absolute bg-[#F4F8F5] px-3 py-1 rounded-full text-[12px] font-semibold text-neutral-500 border border-neutral-200/60">
          {label}
        </span>
      </div>

      {/* Social Grid: 6 buttons (3x2) matching exact screenshot */}
      <div className="grid grid-cols-3 gap-3">
        {/* Row 1: Google, Facebook, Discord */}
        <button
          type="button"
          onClick={() => handleSocialClick("Google", systemSettings.isGoogleAuthEnabled)}
          style={{ filter: systemSettings.isGoogleAuthEnabled ? "none" : "grayscale(100%) opacity(0.35)" }}
          className={`flex h-[48px] items-center justify-center rounded-full border transition-all cursor-pointer ${
            systemSettings.isGoogleAuthEnabled
              ? "border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300"
              : "border-gray-200 bg-gray-100 cursor-not-allowed"
          }`}
          title={systemSettings.isGoogleAuthEnabled ? "Google" : "Google (معطل من الإدارة)"}
        >
          <GoogleIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => handleSocialClick("Facebook", systemSettings.isFacebookAuthEnabled)}
          style={{ filter: systemSettings.isFacebookAuthEnabled ? "none" : "grayscale(100%) opacity(0.35)" }}
          className={`flex h-[48px] items-center justify-center rounded-full border transition-all cursor-pointer ${
            systemSettings.isFacebookAuthEnabled
              ? "border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300"
              : "border-gray-200 bg-gray-100 cursor-not-allowed"
          }`}
          title={systemSettings.isFacebookAuthEnabled ? "Facebook" : "Facebook (معطل من الإدارة)"}
        >
          <FacebookIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => handleSocialClick("Discord", systemSettings.isDiscordAuthEnabled)}
          style={{ filter: systemSettings.isDiscordAuthEnabled ? "none" : "grayscale(100%) opacity(0.35)" }}
          className={`flex h-[48px] items-center justify-center rounded-full border transition-all cursor-pointer ${
            systemSettings.isDiscordAuthEnabled
              ? "border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300"
              : "border-gray-200 bg-gray-100 cursor-not-allowed"
          }`}
          title={systemSettings.isDiscordAuthEnabled ? "Discord" : "Discord (معطل من الإدارة)"}
        >
          <DiscordIcon className="w-5 h-5" />
        </button>

        {/* Row 2: LinkedIn, X, GitHub */}
        <button
          type="button"
          onClick={() => handleSocialClick("LinkedIn", systemSettings.isLinkedinAuthEnabled)}
          style={{ filter: systemSettings.isLinkedinAuthEnabled ? "none" : "grayscale(100%) opacity(0.35)" }}
          className={`flex h-[48px] items-center justify-center rounded-full border transition-all cursor-pointer ${
            systemSettings.isLinkedinAuthEnabled
              ? "border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300"
              : "border-gray-200 bg-gray-100 cursor-not-allowed"
          }`}
          title={systemSettings.isLinkedinAuthEnabled ? "LinkedIn" : "LinkedIn (معطل من الإدارة)"}
        >
          <LinkedinIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => handleSocialClick("X (Twitter)", systemSettings.isXAuthEnabled)}
          style={{ filter: systemSettings.isXAuthEnabled ? "none" : "grayscale(100%) opacity(0.35)" }}
          className={`flex h-[48px] items-center justify-center rounded-full border transition-all cursor-pointer ${
            systemSettings.isXAuthEnabled
              ? "border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300"
              : "border-gray-200 bg-gray-100 cursor-not-allowed"
          }`}
          title={systemSettings.isXAuthEnabled ? "X" : "X (معطل من الإدارة)"}
        >
          <XIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => handleSocialClick("GitHub", systemSettings.isGithubAuthEnabled)}
          style={{ filter: systemSettings.isGithubAuthEnabled ? "none" : "grayscale(100%) opacity(0.35)" }}
          className={`flex h-[48px] items-center justify-center rounded-full border transition-all cursor-pointer ${
            systemSettings.isGithubAuthEnabled
              ? "border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300"
              : "border-gray-200 bg-gray-100 cursor-not-allowed"
          }`}
          title={systemSettings.isGithubAuthEnabled ? "GitHub" : "GitHub (معطل من الإدارة)"}
        >
          <GithubIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
