import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { renderResumePdf } from "@/server/career/resume-pdf";
import { resumeContentSchema } from "@/server/trpc/schemas/career.schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requestedVersion = new URL(request.url).searchParams.get("version");
  const resume = await db.careerResume.findUnique({
    where: { id },
    include: {
      versions: {
        where:
          requestedVersion && requestedVersion !== "latest"
            ? { version: Number(requestedVersion) }
            : undefined,
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });
  const version = resume?.versions[0];
  if (!resume || !version) {
    return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
  }
  const parsed = resumeContentSchema.safeParse(version.content);
  if (!parsed.success) {
    return NextResponse.json({ error: "Resume content is invalid" }, { status: 422 });
  }
  const buffer = await renderResumePdf(parsed.data);
  const filename = `${resume.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resume"}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

