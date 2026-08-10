import React from "react";
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
  return (
    <div className="w-full mt-6 mb-6">
      {/* Divider */}
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-full border-t border-neutral-200/80"></div>
        <span className="absolute bg-[#F4F8F5] px-3 py-1 rounded-full text-[12px] font-semibold text-neutral-500 border border-neutral-200/60">
          {label}
        </span>
      </div>

      {/* Social Grid: 6 buttons (3x2) */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          className="flex h-[48px] items-center justify-center rounded-full border border-neutral-200 bg-white transition-all hover:bg-neutral-50 hover:border-neutral-300"
          title="Discord"
        >
          <DiscordIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          className="flex h-[48px] items-center justify-center rounded-full border border-neutral-200 bg-white transition-all hover:bg-neutral-50 hover:border-neutral-300"
          title="Facebook"
        >
          <FacebookIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          className="flex h-[48px] items-center justify-center rounded-full border border-neutral-200 bg-white transition-all hover:bg-neutral-50 hover:border-neutral-300"
          title="Google"
        >
          <GoogleIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          className="flex h-[48px] items-center justify-center rounded-full border border-neutral-200 bg-white transition-all hover:bg-neutral-50 hover:border-neutral-300"
          title="GitHub"
        >
          <GithubIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          className="flex h-[48px] items-center justify-center rounded-full border border-neutral-200 bg-white transition-all hover:bg-neutral-50 hover:border-neutral-300"
          title="X"
        >
          <XIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          className="flex h-[48px] items-center justify-center rounded-full border border-neutral-200 bg-white transition-all hover:bg-neutral-50 hover:border-neutral-300"
          title="LinkedIn"
        >
          <LinkedinIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
