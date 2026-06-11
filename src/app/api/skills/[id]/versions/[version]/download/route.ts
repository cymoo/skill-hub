import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills, skillVersions } from "@/db/schema";
import { getSkillFullPath } from "@/lib/storage";
import { createZipFromDirectory } from "@/lib/zip";
import { semverSchema } from "@/lib/validators";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    const { id, version: versionParam } = await params;

    const versionResult = semverSchema.safeParse(versionParam);
    if (!versionResult.success) {
      return NextResponse.json({ error: "Invalid version" }, { status: 400 });
    }
    const version = versionResult.data;

    const [skill] = await db
      .select({ name: skills.name })
      .from(skills)
      .where(eq(skills.id, id))
      .limit(1);

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const [versionRecord] = await db
      .select({ storagePath: skillVersions.storagePath })
      .from(skillVersions)
      .where(and(eq(skillVersions.skillId, id), eq(skillVersions.version, version)))
      .limit(1);

    if (!versionRecord) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const fullPath = getSkillFullPath(versionRecord.storagePath);
    const zipBuffer = await createZipFromDirectory(fullPath);

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${skill.name}-${version}.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error("Download version error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
