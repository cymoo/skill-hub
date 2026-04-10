import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills, categories } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { skillNameSchema } from "@/lib/validators";
import {
  generateStoragePath,
  getSkillFullPath,
  ensureDir,
  writeFile,
} from "@/lib/storage";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";

const createSchema = z.object({
  name: skillNameSchema,
  description: z.string().min(1, "Description is required").max(1024),
  customDescription: z.string().max(1024).optional(),
  categoryId: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description, customDescription, categoryId } = result.data;

    // Check duplicate
    const existing = await db
      .select({ id: skills.id })
      .from(skills)
      .where(and(eq(skills.ownerId, user.userId), eq(skills.name, name)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "You already have a skill with this name" },
        { status: 409 }
      );
    }

    // Validate category
    let catId: number | null = null;
    if (categoryId) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);
      if (cat) catId = cat.id;
    }

    // Create directory and SKILL.md template
    const storagePath = generateStoragePath(user.userId, name);
    const fullPath = getSkillFullPath(storagePath);
    await ensureDir(fullPath);

    const skillMd = `---
name: ${name}
description: ${description}
---

# ${name}

${description}

## When to use this skill

Describe when this skill should be activated...

## Instructions

Add your instructions here...
`;

    await writeFile(storagePath, "SKILL.md", skillMd);

    // Create DB record
    const [skill] = await db
      .insert(skills)
      .values({
        name,
        description,
        customDescription:
          customDescription && customDescription.trim().length > 0
            ? customDescription.trim()
            : null,
        categoryId: catId,
        ownerId: user.userId,
        storagePath,
      })
      .returning();

    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    console.error("Create skill error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
