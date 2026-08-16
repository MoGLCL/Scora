import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

type SkillPointsActionPayload = {
  v: 1;
  actorUserId: number;
  targetUserId: number;
  delta: number;
  expectedSkillPoints: number;
  expiresAt: number;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET_REQUIRED");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSkillPointsActionToken(payload: Omit<SkillPointsActionPayload, "v">) {
  const body = Buffer.from(JSON.stringify({ v: 1, ...payload }), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySkillPointsActionToken(token: string): SkillPointsActionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature || signature.length > 128) return null;
  const expected = sign(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SkillPointsActionPayload;
    if (
      payload.v !== 1 ||
      !Number.isInteger(payload.actorUserId) ||
      !Number.isInteger(payload.targetUserId) ||
      !Number.isInteger(payload.delta) ||
      !Number.isInteger(payload.expectedSkillPoints) ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt < Date.now()
    ) return null;
    if (payload.delta === 0 || Math.abs(payload.delta) > 10_000) return null;
    return payload;
  } catch {
    return null;
  }
}
