import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { getSkillFullPath, listDirectory } from "@/lib/storage";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [skill] = await db
      .select({ storagePath: skills.storagePath, name: skills.name })
      .from(skills)
      .where(eq(skills.id, id))
      .limit(1);

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const fullPath = getSkillFullPath(skill.storagePath);
    const tree = await listDirectory(fullPath);

    return NextResponse.json({
      name: skill.name,
      type: "directory" as const,
      children: tree,
    });
  } catch (error) {
    console.error("List files error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
