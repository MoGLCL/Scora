import { NextResponse } from "next/server";
import { getProjectDetail, getProposalFeed } from "@/lib/dal";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = Number(id);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid project ID" }, { status: 400 });
    }

    const [project, proposals] = await Promise.all([
      getProjectDetail(projectId),
      getProposalFeed(projectId),
    ]);

    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, project, proposals });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch project detail" }, { status: 500 });
  }
}
