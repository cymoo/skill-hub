import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills, skillVersions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSkillFullPath, deleteDirectory } from "@/lib/storage";
import { semverSchema } from "@/lib/validators";
import { eq, and, desc } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, version: versionParam } = await params;

    const versionResult = semverSchema.safeParse(versionParam);
    if (!versionResult.success) {
      return NextResponse.json({ error: "Invalid version" }, { status: 400 });
    }
    const version = versionResult.data;

    const [skill] = await db
      .select({ ownerId: skills.ownerId })
      .from(skills)
      .where(eq(skills.id, id))
      .limit(1);

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
    if (skill.ownerId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allVersions = await db
      .select({ version: skillVersions.version, storagePath: skillVersions.storagePath, createdAt: skillVersions.createdAt })
      .from(skillVersions)
      .where(eq(skillVersions.skillId, id))
      .orderBy(desc(skillVersions.createdAt));

    if (allVersions.length <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the only version. Delete the whole skill instead." },
        { status: 400 }
      );
    }

    if (allVersions[0].version === version) {
      return NextResponse.json(
        { error: "Cannot delete the latest version" },
        { status: 400 }
      );
    }

    const target = allVersions.find((v) => v.version === version);
    if (!target) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    await deleteDirectory(getSkillFullPath(target.storagePath)).catch(() => {});

    await db
      .delete(skillVersions)
      .where(and(eq(skillVersions.skillId, id), eq(skillVersions.version, version)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete version error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
