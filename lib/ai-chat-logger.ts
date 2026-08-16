import "server-only";

import { query, queryOne, execute } from "@/lib/db";

export interface LogAiMessageParams {
  sessionKey: string;
  userId: number;
  userRole: string;
  sender: "user" | "assistant";
  content: string;
  modelUsed?: string | null;
  metadata?: Record<string, unknown> | null;
  isError?: boolean;
}

/**
 * Log a single message in an AI conversation session and update the session status.
 */
export async function logAiChatMessage(params: LogAiMessageParams): Promise<void> {
  const {
    sessionKey,
    userId,
    userRole,
    sender,
    content,
    modelUsed = null,
    metadata = null,
    isError = false,
  } = params;

  if (!sessionKey || !userId || !content) return;

  const metadataJson = metadata ? JSON.stringify(metadata) : null;
  const status = isError ? "error" : "active";

  try {
    // 1. Upsert AI Chat Session
    await execute(
      `INSERT INTO ai_chat_sessions (session_key, user_id, user_role, started_at, last_active_at, message_count, model_used, status)
       VALUES (?, ?, ?, NOW(), NOW(), 1, ?, ?)
       ON DUPLICATE KEY UPDATE
         message_count = message_count + 1,
         last_active_at = NOW(),
         model_used = COALESCE(?, model_used),
         status = ?`,
      [sessionKey, userId, userRole, modelUsed, status, modelUsed, status]
    );

    // 2. Insert Chat Message
    await execute(
      `INSERT INTO ai_chat_messages (session_key, user_id, sender, content, model_used, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [sessionKey, userId, sender, content, modelUsed, metadataJson]
    );
  } catch (err) {
    console.error("[ai-chat-logger] Failed to log AI message:", err);
  }
}

export interface AiSessionSummary {
  id: number;
  session_key: string;
  user_id: number;
  user_role: string;
  started_at: string;
  last_active_at: string;
  message_count: number;
  model_used: string | null;
  status: "active" | "completed" | "error";
  user_name: string;
  user_email: string;
  username: string;
  first_message_preview?: string;
}

export interface GetAiSessionsOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

/**
 * Retrieve paginated AI chat sessions for admin inspection.
 */
export async function getAiChatSessions(options: GetAiSessionsOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (options.role && options.role !== "all") {
    conditions.push("s.user_role = ?");
    params.push(options.role);
  }

  if (options.status && options.status !== "all") {
    conditions.push("s.status = ?");
    params.push(options.status);
  }

  if (options.search && options.search.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      "(u.name LIKE ? OR u.email LIKE ? OR u.username LIKE ? OR s.session_key LIKE ? OR EXISTS (SELECT 1 FROM ai_chat_messages m WHERE m.session_key = s.session_key AND m.content LIKE ?))"
    );
    params.push(term, term, term, term, term);
  }

  const whereClause = conditions.join(" AND ");

  const totalRow = await queryOne<{ total: number }>(
    `SELECT COUNT(DISTINCT s.id) as total
     FROM ai_chat_sessions s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE ${whereClause}`,
    params
  );
  const total = totalRow?.total || 0;

  const sessions = await query<AiSessionSummary>(
    `SELECT
       s.id,
       s.session_key,
       s.user_id,
       s.user_role,
       s.started_at,
       s.last_active_at,
       s.message_count,
       s.model_used,
       s.status,
       COALESCE(u.name, 'مستخدم') as user_name,
       COALESCE(u.email, '') as user_email,
       COALESCE(u.username, '') as username,
       (
         SELECT m.content
         FROM ai_chat_messages m
         WHERE m.session_key = s.session_key AND m.sender = 'user'
         ORDER BY m.id ASC
         LIMIT 1
       ) as first_message_preview
     FROM ai_chat_sessions s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE ${whereClause}
     ORDER BY s.last_active_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    sessions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export interface AiChatMessageRecord {
  id: number;
  session_key: string;
  user_id: number;
  sender: "user" | "assistant";
  content: string;
  model_used: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Retrieve all messages for a specific AI conversation session.
 */
export async function getAiSessionMessages(sessionKey: string): Promise<AiChatMessageRecord[]> {
  const rows = await query<AiChatMessageRecord>(
    `SELECT id, session_key, user_id, sender, content, model_used, metadata, created_at
     FROM ai_chat_messages
     WHERE session_key = ?
     ORDER BY id ASC`,
    [sessionKey]
  );

  return rows.map((r) => {
    let parsedMetadata = null;
    if (typeof r.metadata === "string") {
      try {
        parsedMetadata = JSON.parse(r.metadata);
      } catch {}
    } else if (r.metadata && typeof r.metadata === "object") {
      parsedMetadata = r.metadata;
    }
    return {
      ...r,
      metadata: parsedMetadata,
    };
  });
}

/**
 * Delete an entire AI session and its logged messages.
 */
export async function deleteAiSession(sessionKey: string): Promise<boolean> {
  await execute("DELETE FROM ai_chat_messages WHERE session_key = ?", [sessionKey]);
  await execute("DELETE FROM ai_chat_sessions WHERE session_key = ?", [sessionKey]);
  return true;
}
