"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

let toastSequence = 0;

export type UserRole = "developer" | "client" | "guest";

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
  accountType: "personal" | "company";
  fullName: string;
  companyName: string;
  industry: string;
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
  isAdmin: boolean;
  username: string;
  updateUsername: (username: string) => void;
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
  accountType: "personal",
  fullName: "",
  companyName: "",
  industry: "",
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
  isAdmin: boolean;
  username: string;
  isAiAssistantEnabled: boolean;
  showSsdAssistant: boolean;
  developer?: Partial<DeveloperProfileData>;
  client?: Partial<ClientProfileData>;
}

export function ProfileProvider({ children, initialProfile }: { children: React.ReactNode; initialProfile: InitialProfileState }) {
  const [userRoleState, setUserRoleState] = useState<UserRole>(initialProfile.role);
  const [isAdmin] = useState(initialProfile.isAdmin);
  const [username, setUsername] = useState(initialProfile.username);
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
      const handleStorage = (e: StorageEvent) => {
        if (e.key === "scora_admin_system_settings" && e.newValue) {
          try { setSystemSettings((prev) => ({ ...prev, ...JSON.parse(e.newValue!) })); } catch {}
        }
      };

      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    }
  }, []);

  const addToast = (text: string, type: "success" | "info" | "warn" = "info") => {
    const id = `toast-${++toastSequence}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const updateDeveloper = (updated: Partial<DeveloperProfileData>) => {
    setDeveloper((prev) => ({ ...prev, ...updated }));
  };

  const updateClient = (updated: Partial<ClientProfileData>) => {
    setClient((prev) => ({ ...prev, ...updated }));
  };

  const updateSystemSettings = (updated: Partial<AdminSystemSettings>) => {
    setSystemSettings((prev) => {
      return { ...prev, ...updated };
    });
  };

  const [showSsdAssistant, setShowSsdAssistantState] = useState(initialProfile.showSsdAssistant);

  const setShowSsdAssistant = (show: boolean) => {
    setShowSsdAssistantState(show);
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
        isAdmin,
        username,
        updateUsername: setUsername,
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
