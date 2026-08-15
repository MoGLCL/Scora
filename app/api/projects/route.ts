import { NextResponse } from "next/server";
import { listProjects } from "@/lib/dal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json({ ok: true, projects });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch projects" }, { status: 500 });
  }
}
