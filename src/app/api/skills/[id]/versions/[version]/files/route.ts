import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skillVersions } from "@/db/schema";
import { getSkillFullPath, listDirectory } from "@/lib/storage";
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

    const [versionRecord] = await db
      .select({ storagePath: skillVersions.storagePath })
      .from(skillVersions)
      .where(and(eq(skillVersions.skillId, id), eq(skillVersions.version, version)))
      .limit(1);

    if (!versionRecord) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const fullPath = getSkillFullPath(versionRecord.storagePath);
    const tree = await listDirectory(fullPath);

    return NextResponse.json({ name: version, type: "directory" as const, children: tree });
  } catch (error) {
    console.error("List version files error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
