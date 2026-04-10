import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills, users, categories, stars } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getSkillFullPath, deleteDirectory } from "@/lib/storage";
import { eq, and, sql } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [skill] = await db
      .select({
        id: skills.id,
        name: skills.name,
        description:
          sql<string>`coalesce(${skills.customDescription}, ${skills.description})`.as(
            "description"
          ),
        customDescription: skills.customDescription,
        metadataDescription: skills.description,
        starCount: skills.starCount,
        downloadCount: skills.downloadCount,
        license: skills.license,
        compatibility: skills.compatibility,
        metadata: skills.metadata,
        storagePath: skills.storagePath,
        createdAt: skills.createdAt,
        updatedAt: skills.updatedAt,
        ownerId: skills.ownerId,
        ownerUsername: users.username,
        categoryId: skills.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(skills)
      .leftJoin(users, eq(skills.ownerId, users.id))
      .leftJoin(categories, eq(skills.categoryId, categories.id))
      .where(eq(skills.id, id))
      .limit(1);

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Check star status
    const currentUser = await getCurrentUser();
    let isStarred = false;
    if (currentUser) {
      const [star] = await db
        .select()
        .from(stars)
        .where(
          and(eq(stars.userId, currentUser.userId), eq(stars.skillId, id))
        )
        .limit(1);

      if (star) {
        isStarred = true;
      }
    }

    return NextResponse.json({ skill: { ...skill, isStarred } });
  } catch (error) {
    console.error("Get skill error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check ownership
    const [skill] = await db
      .select()
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
    const updates: Record<string, unknown> = {};

    if (body.categoryId !== undefined) {
      if (body.categoryId === null) {
        updates.categoryId = null;
      } else if (typeof body.categoryId === "number") {
        const [category] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, body.categoryId))
          .limit(1);

        if (!category) {
          return NextResponse.json(
            { error: "Category not found" },
            { status: 400 }
          );
        }

        updates.categoryId = body.categoryId;
      } else {
        return NextResponse.json(
          { error: "Invalid categoryId" },
          { status: 400 }
        );
      }
    }
    const customDescriptionInput =
      body.customDescription !== undefined
        ? body.customDescription
        : body.description;
    if (customDescriptionInput !== undefined) {
      if (customDescriptionInput === null) {
        updates.customDescription = null;
      } else if (typeof customDescriptionInput === "string") {
        const trimmed = customDescriptionInput.trim();
        updates.customDescription = trimmed.length > 0 ? trimmed : null;
      } else {
        return NextResponse.json(
          { error: "Invalid customDescription" },
          { status: 400 }
        );
      }
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(skills)
      .set(updates)
      .where(eq(skills.id, id))
      .returning();

    return NextResponse.json({ skill: updated });
  } catch (error) {
    console.error("Update skill error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [skill] = await db
      .select()
      .from(skills)
      .where(eq(skills.id, id))
      .limit(1);

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    if (skill.ownerId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete files
    const fullPath = getSkillFullPath(skill.storagePath);
    await deleteDirectory(fullPath);

    // Delete from DB (cascades to stars)
    await db.delete(skills).where(eq(skills.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete skill error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
