import { NextResponse } from "next/server";
import { getTicketDetails, sendTicketReply } from "@/lib/actions/tickets";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const id = Number(ticketId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  const result = await getTicketDetails(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const id = Number(ticketId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => ({}))) as { body?: string };
  if (!payload.body || typeof payload.body !== "string" || !payload.body.trim()) {
    return NextResponse.json({ error: "MESSAGE_REQUIRED" }, { status: 400 });
  }

  const result = await sendTicketReply({ ticketId: id, body: payload.body.trim() });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const updated = await getTicketDetails(id);
  return NextResponse.json(updated);
}
