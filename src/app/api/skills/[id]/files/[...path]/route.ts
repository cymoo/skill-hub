import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { deleteEntry, readFile, renameEntry, writeFile } from "@/lib/storage";
import { parseSkillMd } from "@/lib/skill-parser";
import { filePathSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const { id, path: pathSegments } = await params;
    const filePath = pathSegments.join("/");

    const [skill] = await db
      .select({ storagePath: skills.storagePath })
      .from(skills)
      .where(eq(skills.id, id))
      .limit(1);

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const content = await readFile(skill.storagePath, filePath);
    return NextResponse.json({ content, path: filePath });
  } catch (error) {
    console.error("Read file error:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, path: pathSegments } = await params;
    const filePath = pathSegments.join("/");

    const pathResult = filePathSchema.safeParse(filePath);
    if (!pathResult.success) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const normalizedPath = pathResult.data;

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
    const { content } = body;

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "Content must be a string" },
        { status: 400 }
      );
    }

    await writeFile(skill.storagePath, normalizedPath, content);

    // If updating SKILL.md, re-parse and update DB
    if (normalizedPath === "SKILL.md") {
      try {
        const metadata = parseSkillMd(content);
        await db
          .update(skills)
          .set({
            description: metadata.description,
            license: metadata.license,
            compatibility: metadata.compatibility,
            metadata: metadata.metadata,
            updatedAt: new Date(),
          })
          .where(eq(skills.id, id));
      } catch {
        // If parsing fails, still save the file but don't update DB metadata
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Write file error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, path: pathSegments } = await params;
    const oldPath = pathSegments.join("/");

    const oldPathResult = filePathSchema.safeParse(oldPath);
    if (!oldPathResult.success) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const body = await request.json();
    const { newPath } = body as { newPath?: string };

    const newPathResult = filePathSchema.safeParse(newPath);
    if (!newPathResult.success) {
      return NextResponse.json({ error: "Invalid new path" }, { status: 400 });
    }

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

    await renameEntry(skill.storagePath, oldPathResult.data, newPathResult.data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rename file or directory error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, path: pathSegments } = await params;
    const targetPath = pathSegments.join("/");

    const pathResult = filePathSchema.safeParse(targetPath);
    if (!pathResult.success) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

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

    await deleteEntry(skill.storagePath, pathResult.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete file or directory error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
