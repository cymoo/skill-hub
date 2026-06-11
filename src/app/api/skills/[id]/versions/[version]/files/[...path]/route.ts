import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skillVersions } from "@/db/schema";
import { readFile } from "@/lib/storage";
import { semverSchema } from "@/lib/validators";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string; path: string[] }> }
) {
  try {
    const { id, version: versionParam, path: pathSegments } = await params;
    const filePath = pathSegments.join("/");

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

    const content = await readFile(versionRecord.storagePath, filePath);
    return NextResponse.json({ content, path: filePath });
  } catch (error) {
    console.error("Read version file error:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
