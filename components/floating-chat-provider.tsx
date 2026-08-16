"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface FloatingChatUser {
  id: number;
  name: string;
  username?: string | null;
  avatar?: string | null;
  kind?: string;
  isMinimized?: boolean;
}

interface FloatingChatContextType {
  openChats: FloatingChatUser[];
  openFloatingChat: (user: Omit<FloatingChatUser, "isMinimized">) => void;
  closeFloatingChat: (userId: number) => void;
  toggleMinimizeFloatingChat: (userId: number) => void;
}

const FloatingChatContext = createContext<FloatingChatContextType | undefined>(undefined);

export function FloatingChatProvider({ children }: { children: React.ReactNode }) {
  const [openChats, setOpenChats] = useState<FloatingChatUser[]>([]);

  /**
   * Open a floating chat with maximum 2 simultaneous chats (FIFO / LRU):
   * - If user is already open: bring to top and un-minimize.
   * - If 0 or 1 open: append the new user (now 1 or 2).
   * - If 2 already open: close the oldest (1st) and append new user (keeping exactly 2).
   */
  const openFloatingChat = useCallback((targetUser: Omit<FloatingChatUser, "isMinimized">) => {
    setOpenChats((current) => {
      const existingIndex = current.findIndex((c) => c.id === targetUser.id);
      if (existingIndex >= 0) {
        // Already open: un-minimize and move to most recent
        const updated = { ...current[existingIndex], ...targetUser, isMinimized: false };
        const others = current.filter((c) => c.id !== targetUser.id);
        return [...others, updated];
      }

      const newItem: FloatingChatUser = { ...targetUser, isMinimized: false };
      if (current.length < 2) {
        return [...current, newItem];
      }

      // Exactly 2 are open: drop the first (oldest) and append the new one!
      return [current[1], newItem];
    });
  }, []);

  const closeFloatingChat = useCallback((userId: number) => {
    setOpenChats((current) => current.filter((c) => c.id !== userId));
  }, []);

  const toggleMinimizeFloatingChat = useCallback((userId: number) => {
    setOpenChats((current) =>
      current.map((c) => (c.id === userId ? { ...c, isMinimized: !c.isMinimized } : c))
    );
  }, []);

  return (
    <FloatingChatContext.Provider
      value={{
        openChats,
        openFloatingChat,
        closeFloatingChat,
        toggleMinimizeFloatingChat,
      }}
    >
      {children}
    </FloatingChatContext.Provider>
  );
}

export function useFloatingChat() {
  const ctx = useContext(FloatingChatContext);
  if (!ctx) {
    throw new Error("useFloatingChat must be used within FloatingChatProvider");
  }
  return ctx;
}
