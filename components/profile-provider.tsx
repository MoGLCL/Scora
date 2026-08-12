"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "developer" | "client" | "guest" | "admin";

export interface AdminSystemSettings {
  isAiAssistantEnabled: boolean;
  isMaintenanceMode: boolean;
  isQuickRegistrationOpen: boolean;
  isQuickLoginOpen: boolean;
  // SMTP Email Server Config
  isSmtpEnabled: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFromEmail: string;
  smtpFromName: string;
  // 6 Quick OAuth Sign-In Integrations
  isGoogleAuthEnabled: boolean;
  googleClientId: string;
  isFacebookAuthEnabled: boolean;
  facebookAppId: string;
  isDiscordAuthEnabled: boolean;
  discordClientId: string;
  isLinkedinAuthEnabled: boolean;
  linkedinClientId: string;
  isXAuthEnabled: boolean;
  xClientId: string;
  isGithubAuthEnabled: boolean;
  githubClientId: string;
  // One-Click & Phone OTP
  isPhoneOtpEnabled: boolean;
  phoneOtpProvider: string;
  isOneClickDemoEnabled: boolean;
  oneClickDefaultRole: "developer" | "client";
  // AI Engine Credentials
  aiAssistantBaseUrl: string;
  aiAssistantApiKey: string;
  trustEngineModel: string;
  baseTrustPoints: number;
  integrityPenalty: number;
  spExchangeRate: number;
  minTrustThreshold: number;
}

export interface AppliedProjectItem {
  id: string;
  title: string;
  clientName: string;
  proposedPrice: string;
  deliveryDays: string;
  status: "مفتوح لتلقي العروض" | "قيد التقييم والمراجعة" | "تم القبول والتكليف" | "مكتمل ومسلم";
  appliedDate: string;
}

export interface DeveloperProfileData {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
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
  appliedProjects: AppliedProjectItem[];
}

export interface ClientProfileData {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
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
  systemSettings: AdminSystemSettings;
  updateSystemSettings: (updated: Partial<AdminSystemSettings>) => void;
  updateDeveloper: (updated: Partial<DeveloperProfileData>) => void;
  updateClient: (updated: Partial<ClientProfileData>) => void;
  addAppliedProject: (project: AppliedProjectItem) => void;
  showSsdAssistant: boolean;
  setShowSsdAssistant: (show: boolean) => void;
  toasts: ToastMessage[];
  addToast: (text: string, type?: "success" | "info" | "warn") => void;
  removeToast: (id: string) => void;
}

const defaultDeveloper: DeveloperProfileData = {
  fullName: "",
  jobTitle: "",
  email: "",
  phone: "",
  location: "",
  availability: "available",
  bio: "",
  avatarUrl: null,
  skills: [],
  trustScore: 0,
  skillPoints: 0,
  status: "جديد",
  github: "",
  linkedin: "",
  website: "",
  assessments: [],
  projects: [],
  appliedProjects: [],
};

const defaultClient: ClientProfileData = {
  fullName: "",
  companyName: "",
  email: "",
  phone: "",
  location: "",
  avatarUrl: null,
  website: "",
  stats: {
    completed: 0,
    closed: 0,
    pending: 0,
    open: 0,
  },
  jobRequests: [],
  recentActivity: [],
  reviews: [],
};

const defaultSystemSettings: AdminSystemSettings = {
  isAiAssistantEnabled: true,
  isMaintenanceMode: false,
  isQuickRegistrationOpen: true,
  isQuickLoginOpen: true,
  // SMTP Email Server Defaults
  isSmtpEnabled: false,
  smtpHost: "",
  smtpPort: "587",
  smtpUser: "",
  smtpPass: "",
  smtpFromEmail: "",
  smtpFromName: "",
  isGoogleAuthEnabled: false,
  googleClientId: "",
  isFacebookAuthEnabled: false,
  facebookAppId: "",
  isDiscordAuthEnabled: false,
  discordClientId: "",
  isLinkedinAuthEnabled: false,
  linkedinClientId: "",
  isXAuthEnabled: false,
  xClientId: "",
  isGithubAuthEnabled: false,
  githubClientId: "",
  isPhoneOtpEnabled: false,
  phoneOtpProvider: "",
  isOneClickDemoEnabled: false,
  oneClickDefaultRole: "developer",
  aiAssistantBaseUrl: "",
  aiAssistantApiKey: "",
  trustEngineModel: "",
  baseTrustPoints: 15,
  integrityPenalty: 25,
  spExchangeRate: 25,
  minTrustThreshold: 80,
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export interface InitialProfileState {
  role: UserRole;
  isAiAssistantEnabled: boolean;
  developer?: Partial<DeveloperProfileData>;
  client?: Partial<ClientProfileData>;
}

export function ProfileProvider({ children, initialProfile }: { children: React.ReactNode; initialProfile: InitialProfileState }) {
  const [userRoleState, setUserRoleState] = useState<UserRole>(initialProfile.role);
  const [developer, setDeveloper] = useState<DeveloperProfileData>({ ...defaultDeveloper, ...initialProfile.developer });
  const [client, setClient] = useState<ClientProfileData>({ ...defaultClient, ...initialProfile.client });
  const [systemSettings, setSystemSettings] = useState<AdminSystemSettings>({ ...defaultSystemSettings, isAiAssistantEnabled: initialProfile.isAiAssistantEnabled });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
    if (typeof window !== "undefined") {
      if (role !== "guest") {
        localStorage.setItem("scora_user_role", role);
      } else {
        localStorage.removeItem("scora_user_role");
      }
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSettings = localStorage.getItem("scora_admin_system_settings");
      if (savedSettings) {
        try { setSystemSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) })); } catch (e) {}
      }

      const savedDev = localStorage.getItem("scora_developer_profile");
      if (savedDev) {
        try { setDeveloper((prev) => ({ ...prev, ...JSON.parse(savedDev) })); } catch (e) {}
      }

      const savedClient = localStorage.getItem("scora_client_profile");
      if (savedClient) {
        try { setClient((prev) => ({ ...prev, ...JSON.parse(savedClient) })); } catch (e) {}
      }

      const handleStorage = (e: StorageEvent) => {
        if (e.key === "scora_admin_system_settings" && e.newValue) {
          try { setSystemSettings((prev) => ({ ...prev, ...JSON.parse(e.newValue!) })); } catch (err) {}
        }
      };

      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    }
  }, []);

  // Client-side Security Route Guard
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pathname = window.location.pathname;

    // 1. ADMIN FULL ACCESS RULE: Admin can access ALL pages except /login and /register
    if (userRoleState === "admin") {
      if (pathname === "/login" || pathname === "/register") {
        window.location.href = "/admin";
      }
      return;
    }

    const protectedPaths = [
      "/dashboard",
      "/profile",
      "/client-profile",
      "/projects/new",
      "/chat",
      "/assessments",
    ];
    const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

    if (isProtected && userRoleState === "guest") {
      addToast("يرجى تسجيل الدخول أولاً للوصول لهذه الصفحة", "warn");
      window.location.href = `/login?from=${encodeURIComponent(pathname)}`;
      return;
    }

    if (pathname.startsWith("/admin") && (userRoleState as string) !== "admin") {
      addToast("عذراً، هذه الصفحة مخصصة لمديري النظام فقط", "warn");
      window.location.href = "/login";
      return;
    }

    // Mandatory Developer Onboarding Guard
    if (
      userRoleState === "developer" &&
      (!developer.jobTitle || developer.skills.length === 0) &&
      !pathname.startsWith("/complete-profile") &&
      !pathname.startsWith("/laws") &&
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/register")
    ) {
      addToast("يرجى إكمال بيانات الملف الشخصي والمهارات أولاً للتمكن من استخدام المنصة", "warn");
      window.location.href = "/complete-profile";
      return;
    }

    // Mandatory Client Onboarding Guard
    if (
      userRoleState === "client" &&
      !client.fullName &&
      !pathname.startsWith("/complete-client-profile") &&
      !pathname.startsWith("/laws") &&
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/register")
    ) {
      addToast("يرجى إكمال بياناتك الشخصية أولاً للتمكن من استخدام المنصة", "warn");
      window.location.href = "/complete-client-profile";
      return;
    }
  }, [userRoleState, developer, client]);

  const addToast = (text: string, type: "success" | "info" | "warn" = "info") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const updateDeveloper = (updated: Partial<DeveloperProfileData>) => {
    setDeveloper((prev) => {
      const next = { ...prev, ...updated };
      if (typeof window !== "undefined") {
        localStorage.setItem("scora_developer_profile", JSON.stringify(next));
      }
      return next;
    });
  };

  const updateClient = (updated: Partial<ClientProfileData>) => {
    setClient((prev) => {
      const next = { ...prev, ...updated };
      if (typeof window !== "undefined") {
        localStorage.setItem("scora_client_profile", JSON.stringify(next));
      }
      return next;
    });
  };

  const updateSystemSettings = (updated: Partial<AdminSystemSettings>) => {
    setSystemSettings((prev) => {
      const next = { ...prev, ...updated };
      if (typeof window !== "undefined") {
        localStorage.setItem("scora_admin_system_settings", JSON.stringify(next));
      }
      return next;
    });
  };

  const [showSsdAssistant, setShowSsdAssistantState] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("scora_show_ssd_assistant");
      if (saved !== null) {
        setShowSsdAssistantState(saved === "true");
      }
    }
  }, []);

  const setShowSsdAssistant = (show: boolean) => {
    setShowSsdAssistantState(show);
    if (typeof window !== "undefined") {
      localStorage.setItem("scora_show_ssd_assistant", String(show));
    }
  };

  const addAppliedProject = (project: AppliedProjectItem) => {
    setDeveloper((prev) => ({
      ...prev,
      appliedProjects: [project, ...prev.appliedProjects],
    }));
  };

  return (
    <ProfileContext.Provider
      value={{
        userRole: userRoleState,
        setUserRole,
        developer,
        client,
        systemSettings,
        updateSystemSettings,
        updateDeveloper,
        updateClient,
        addAppliedProject,
        showSsdAssistant,
        setShowSsdAssistant,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
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
