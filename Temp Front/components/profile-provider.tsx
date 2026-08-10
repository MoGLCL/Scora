"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "developer" | "client" | "guest";

export interface DeveloperProfileData {
  fullName: string;
  jobTitle: string;
  email: string;
  location: string;
  availability: "available" | "busy";
  bio: string;
  avatarUrl: string | null;
  skills: string[];
  trustScore: number;
  skillPoints: number;
  status: string;
  github: string;
  linkedin: string;
  website: string;
  assessments: Array<{
    id: string;
    title: string;
    subtext: string;
    status: string;
    statusType: "success" | "warning" | "info";
  }>;
  projects: Array<{
    id: string;
    title: string;
    subtext: string;
    tags: string[];
    iconType: "wifi" | "check";
  }>;
}

export interface ClientProfileData {
  fullName: string;
  companyName: string;
  email: string;
  location: string;
  avatarUrl: string | null;
  website: string;
  stats: {
    completed: number;
    closed: number;
    pending: number;
    open: number;
  };
  jobRequests: Array<{
    id: string;
    title: string;
    subtext: string;
    tags: string[];
    statusType: "wifi" | "check";
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    time: string;
  }>;
  reviews: Array<{
    id: string;
    developerName: string;
    role: string;
    comment: string;
    time: string;
  }>;
}

interface ToastMessage {
  id: string;
  text: string;
  type?: "success" | "info" | "warn";
}

interface ProfileContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  developer: DeveloperProfileData;
  client: ClientProfileData;
  updateDeveloper: (updated: Partial<DeveloperProfileData>) => void;
  updateClient: (updated: Partial<ClientProfileData>) => void;
  toasts: ToastMessage[];
  addToast: (text: string, type?: "success" | "info" | "warn") => void;
  removeToast: (id: string) => void;
}

const defaultDeveloper: DeveloperProfileData = {
  fullName: "محمد وائل الغنام",
  jobTitle: "Software Developer · Full-stack",
  email: "mohammed@scora.dev",
  location: "القاهرة، مصر",
  availability: "available",
  bio: "أبني منتجات ويب قابلة للتوسع وأشرح قراراتي التقنية بوضوح. أفضّل العمل على حلول عملية يمكن صيانتها.",
  avatarUrl: null,
  skills: [
    "Python",
    "Node.js",
    "React",
    "TypeScript",
    "Testing",
    "Docker",
    "GraphQL",
    "PostgreSQL",
  ],
  trustScore: 92,
  skillPoints: 820,
  status: "Verified",
  github: "https://github.com/mohammed-wael",
  linkedin: "https://linkedin.com/in/mohammed-wael",
  website: "https://mohammed.dev",
  assessments: [
    { id: "1", title: "Coding Challenge", subtext: "منذ 3 أيام · React + TypeScript", status: "Passed", statusType: "success" },
    { id: "2", title: "Technical Interview", subtext: "منذ 11 يوماً · Architecture", status: "Verified", statusType: "success" },
    { id: "3", title: "Code Quality Review", subtext: "منذ 18 يوماً · Repository sample", status: "Review", statusType: "warning" },
  ],
  projects: [
    { id: "1", title: "منصة إدارة المشاريع", subtext: "Web app · 2026", tags: ["React", "Node.js"], iconType: "wifi" },
    { id: "2", title: "مراجع جودة الكود", subtext: "Developer tool · 2025", tags: ["Python", "API"], iconType: "check" },
  ],
};

const defaultClient: ClientProfileData = {
  fullName: "أحمد خالد",
  companyName: "Scora Technologies",
  email: "ahmed.khaled@company.com",
  location: "القاهرة، مصر",
  avatarUrl: null,
  website: "https://company.dev",
  stats: {
    completed: 6,
    closed: 8,
    pending: 2,
    open: 4,
  },
  jobRequests: [
    { id: "1", title: "Frontend Engineer — SaaS", subtext: "Open · منذ 3 أيام", tags: ["React", "Node.js"], statusType: "wifi" },
    { id: "2", title: "Backend API — E-commerce", subtext: "Pending · منذ أسبوع", tags: ["Next.js", "Postgres"], statusType: "wifi" },
    { id: "3", title: "React Developer — Part-time", subtext: "Completed · منذ شهر", tags: ["Python", "API"], statusType: "check" },
  ],
  recentActivity: [
    { id: "1", action: "آخر تسجيل دخول", time: "منذ ساعتين" },
    { id: "2", action: "آخر طلب توظيف", time: "منذ يوم" },
    { id: "3", action: "آخر رد على مطور", time: "منذ 3 أيام" },
  ],
  reviews: [
    { id: "1", developerName: "سارة محمد", role: "Frontend Developer", comment: "متطلبات واضحة وتواصل سريع.", time: "منذ 4 أيام" },
    { id: "2", developerName: "محمود علي", role: "Backend Developer", comment: "دورة مراجعة منظمة ومحترمة.", time: "منذ أسبوعين" },
  ],
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRoleState] = useState<UserRole>("guest");
  const [developer, setDeveloper] = useState<DeveloperProfileData>(defaultDeveloper);
  const [client, setClient] = useState<ClientProfileData>(defaultClient);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      const savedRole = localStorage.getItem("scora_user_role") as UserRole | null;
      if (savedRole) setUserRoleState(savedRole);

      const savedDev = localStorage.getItem("scora_developer_profile");
      if (savedDev) setDeveloper(JSON.parse(savedDev));

      const savedClient = localStorage.getItem("scora_client_profile");
      if (savedClient) setClient(JSON.parse(savedClient));
    } catch (e) {
      console.error("Error loading profile from localStorage:", e);
    }
  }, []);

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
    try {
      localStorage.setItem("scora_user_role", role);
    } catch (e) {}
    const roleName = role === "developer" ? "مطور" : role === "client" ? "عميل / شركة" : "زائر";
    addToast(`تم التبديل إلى وضع: ${roleName}`, "info");
  };

  const updateDeveloper = (updated: Partial<DeveloperProfileData>) => {
    setDeveloper((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem("scora_developer_profile", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    addToast("تم تحديث بيانات ملف المطور بنجاح!", "success");
  };

  const updateClient = (updated: Partial<ClientProfileData>) => {
    setClient((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem("scora_client_profile", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    addToast("تم تحديث بيانات ملف العميل بنجاح!", "success");
  };

  const addToast = (text: string, type: "success" | "info" | "warn" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ProfileContext.Provider
      value={{
        userRole,
        setUserRole,
        developer,
        client,
        updateDeveloper,
        updateClient,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-neutral-900/95 backdrop-blur-md px-5 py-3 text-[14px] font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${toast.type === "info" ? "bg-blue-400" : toast.type === "warn" ? "bg-amber-400" : "bg-emerald-400"}`} />
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
