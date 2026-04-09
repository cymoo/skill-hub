import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { getSkillFullPath } from "@/lib/storage";
import { createZipFromDirectory } from "@/lib/zip";
import { eq, sql } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [skill] = await db
      .select()
      .from(skills)
      .where(eq(skills.id, id))
      .limit(1);

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const fullPath = getSkillFullPath(skill.storagePath);
    const zipBuffer = await createZipFromDirectory(fullPath);

    // Increment download count
    await db
      .update(skills)
      .set({ downloadCount: sql`${skills.downloadCount} + 1` })
      .where(eq(skills.id, id));

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${skill.name}.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error("Download skill error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
