import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { createDirectory, getSkillFullPath, listDirectory, writeFile } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";
import { filePathSchema } from "@/lib/validators";
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [skill] = await db
      .select({ storagePath: skills.storagePath, ownerId: skills.ownerId })
      .from(skills)
      .where(eq(skills.id, id))
      .limit(1);

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    if (skill.ownerId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { path, type } = body as { path?: string; type?: "file" | "directory" };

    const pathResult = filePathSchema.safeParse(path);
    if (!pathResult.success) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const normalizedPath = pathResult.data;

    if (type === "directory") {
      await createDirectory(skill.storagePath, normalizedPath);
      return NextResponse.json({ success: true });
    }

    if (type === "file") {
      await writeFile(skill.storagePath, normalizedPath, "");
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Create file or directory error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
