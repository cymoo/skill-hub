import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills, users, categories } from "@/db/schema";
import { eq, and, desc, ne, sql } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the skill's owner
    const [skill] = await db
      .select({ ownerId: skills.ownerId })
      .from(skills)
      .where(eq(skills.id, id))
      .limit(1);

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Get other skills by the same author
    const authorSkills = await db
      .select({
        id: skills.id,
        name: skills.name,
        description:
          sql<string>`coalesce(${skills.customDescription}, ${skills.description})`.as(
            "description"
          ),
        starCount: skills.starCount,
        downloadCount: skills.downloadCount,
        createdAt: skills.createdAt,
        ownerUsername: users.username,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(skills)
      .leftJoin(users, eq(skills.ownerId, users.id))
      .leftJoin(categories, eq(skills.categoryId, categories.id))
      .where(and(eq(skills.ownerId, skill.ownerId), ne(skills.id, id)))
      .orderBy(desc(skills.createdAt))
      .limit(10);

    return NextResponse.json({ skills: authorSkills });
  } catch (error) {
    console.error("Get author skills error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
