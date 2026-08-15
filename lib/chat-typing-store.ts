// In-memory ephemeral Typing store with auto-expiry
const globalForTyping = globalThis as unknown as {
  scoraTypingStore?: Map<string, number>;
};

export const typingStore = globalForTyping.scoraTypingStore ?? new Map<string, number>();

if (process.env.NODE_ENV !== "production") {
  globalForTyping.scoraTypingStore = typingStore;
}
