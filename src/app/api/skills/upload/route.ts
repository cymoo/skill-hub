import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills, categories } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { MAX_ZIP_SIZE } from "@/lib/constants";
import { extractZipToDirectory } from "@/lib/zip";
import { parseSkillMd } from "@/lib/skill-parser";
import {
  generateStoragePath,
  getSkillFullPath,
  ensureDir,
  exists,
  deleteDirectory,
} from "@/lib/storage";
import { eq, and } from "drizzle-orm";
import path from "path";
import fs from "fs/promises";

export async function POST(request: NextRequest) {
  let tempDir: string | null = null;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const categoryId = formData.get("categoryId") as string | null;
    const customDescriptionInput = formData.get("description");
    const customDescription =
      typeof customDescriptionInput === "string" &&
      customDescriptionInput.trim().length > 0
        ? customDescriptionInput.trim()
        : null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (file.size > MAX_ZIP_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_ZIP_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "Only ZIP files are accepted" },
        { status: 400 }
      );
    }

    // Extract to temp directory
    const buffer = Buffer.from(await file.arrayBuffer());
    tempDir = path.join(
      process.cwd(),
      ".uploads",
      `skill-upload-${Date.now()}`
    );
    await ensureDir(tempDir);

    await extractZipToDirectory(buffer, tempDir);

    // Check if files are in a subdirectory (common in zip)
    const entries = await fs.readdir(tempDir);
    let skillRoot = tempDir;

    if (entries.length === 1) {
      const subPath = path.join(tempDir, entries[0]);
      const stat = await fs.stat(subPath);
      if (stat.isDirectory()) {
        skillRoot = subPath;
      }
    }

    // Check SKILL.md exists
    const skillMdPath = path.join(skillRoot, "SKILL.md");
    if (!(await exists(skillMdPath))) {
      return NextResponse.json(
        { error: "ZIP must contain a SKILL.md file" },
        { status: 400 }
      );
    }

    // Parse SKILL.md
    const skillMdContent = await fs.readFile(skillMdPath, "utf-8");
    const metadata = parseSkillMd(skillMdContent);

    // Check if skill already exists for this user
    const existingSkill = await db
      .select({ id: skills.id, storagePath: skills.storagePath })
      .from(skills)
      .where(
        and(eq(skills.ownerId, user.userId), eq(skills.name, metadata.name))
      )
      .limit(1);

    if (existingSkill.length > 0) {
      // Update existing - remove old files
      const oldPath = getSkillFullPath(existingSkill[0].storagePath);
      await deleteDirectory(oldPath);
    }

    // Move to final destination
    const storagePath = generateStoragePath(user.userId, metadata.name);
    const destPath = getSkillFullPath(storagePath);
    await deleteDirectory(destPath);
    await ensureDir(path.dirname(destPath));
    await fs.rename(skillRoot, destPath);

    // Validate category
    let catId: number | null = null;
    if (categoryId) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, parseInt(categoryId)))
        .limit(1);
      if (cat) catId = cat.id;
    }

    if (existingSkill.length > 0) {
      // Update existing skill
      const [skill] = await db
        .update(skills)
        .set({
          description: metadata.description,
          customDescription,
          categoryId: catId,
          storagePath,
          license: metadata.license,
          compatibility: metadata.compatibility,
          metadata: metadata.metadata,
          updatedAt: new Date(),
        })
        .where(eq(skills.id, existingSkill[0].id))
        .returning();

      return NextResponse.json({ skill });
    }

    // Create new skill
    const [skill] = await db
      .insert(skills)
      .values({
        name: metadata.name,
        description: metadata.description,
        customDescription,
        categoryId: catId,
        ownerId: user.userId,
        storagePath,
        license: metadata.license,
        compatibility: metadata.compatibility,
        metadata: metadata.metadata,
      })
      .returning();

    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    console.error("Upload skill error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  } finally {
    // Cleanup temp directory
    if (tempDir) {
      await deleteDirectory(tempDir).catch(() => {});
    }
  }
}
