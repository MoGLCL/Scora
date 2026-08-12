"use server";

import { queryOne } from "@/lib/db";
import { getSession, createSession, type AppRole } from "@/lib/session";
import type { UserRow } from "@/lib/types";

export interface UserDbSessionResult {
  authenticated: boolean;
  userId?: number;
  email?: string;
  fullName?: string;
  phone?: string;
  role?: "developer" | "client" | "admin" | "guest";
  status?: string;
  devDetails?: {
    jobTitle?: string;
    skills?: string[];
    trustScore?: number;
    skillPoints?: number;
    phone?: string;
  };
  clientDetails?: {
    companyName?: string;
    location?: string;
    phone?: string;
  };
}

/**
 * Real-time MySQL Database Session Sync Action.
 * Queries MySQL `users` table directly on every mount to ensure total synchronization.
 * Uses ONLY the signed JWT session cookie — never falls back to guessing the user.
 */
export async function syncUserSessionWithDb(): Promise<UserDbSessionResult> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { authenticated: false, role: "guest" };
    }

    // Query MySQL Database directly for current user row
    const user = await queryOne<UserRow>(
      "SELECT id, email, full_name, phone, role, status FROM users WHERE id = ?",
      [session.userId]
    );

    // If user was deleted from MySQL database
    if (!user) {
      return { authenticated: false, role: "guest" };
    }
    if (user.status !== "active") return { authenticated: false, role: "guest", status: user.status };

    // Refresh session cookie if role changed in DB (e.g. promoted to admin)
    if (user.role !== session.role) {
      try {
        await createSession(user.id, user.role as AppRole);
      } catch {
        // Cookie refresh is best-effort
      }
    }

    // If developer, fetch developer row from MySQL
    let devDetails;
    if (user.role === "developer") {
      const dev = await queryOne<{ job_title: string; trust_score: number; skill_points: number; phone: string | null }>(
        "SELECT job_title, trust_score, skill_points, phone FROM developers WHERE user_id = ?",
        [user.id]
      );
      if (dev) {
        devDetails = {
          jobTitle: dev.job_title || "",
          trustScore: dev.trust_score || 0,
          skillPoints: dev.skill_points || 0,
          phone: dev.phone || user.phone || "",
        };
      }
    }

    // If client, fetch client row from MySQL
    let clientDetails;
    if (user.role === "client") {
      const cli = await queryOne<{ company_name: string; location: string; phone: string | null }>(
        "SELECT company_name, location, phone FROM clients WHERE user_id = ?",
        [user.id]
      );
      if (cli) {
        clientDetails = {
          companyName: cli.company_name || "",
          location: cli.location || "",
          phone: cli.phone || user.phone || "",
        };
      }
    }

    return {
      authenticated: true,
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone || "",
      role: user.role as "developer" | "client" | "admin",
      devDetails,
      clientDetails,
    };
  } catch (error) {
    console.error("[DB SESSION SYNC ERROR]:", error);
    return { authenticated: false, role: "guest" };
  }
}
