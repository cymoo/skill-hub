import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { readFile, writeFile } from "@/lib/storage";
import { parseSkillMd } from "@/lib/skill-parser";
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

    // Validate path
    if (filePath.includes("..")) {
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

    const body = await request.json();
    const { content } = body;

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "Content must be a string" },
        { status: 400 }
      );
    }

    await writeFile(skill.storagePath, filePath, content);

    // If updating SKILL.md, re-parse and update DB
    if (filePath === "SKILL.md") {
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
