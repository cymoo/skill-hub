import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills, users, categories, stars } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { eq, desc, asc, ilike, or, and, count, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(
      searchParams.get("limit") || String(ITEMS_PER_PAGE)
    );
    const search = searchParams.get("search") || "";
    const categorySlug = searchParams.get("category") || "";
    const categoryIdParam = searchParams.get("categoryId") || "";
    const owner = searchParams.get("owner") || "";
    const sort = searchParams.get("sort") || "created_at";
    const order = searchParams.get("order") || "desc";
    const offset = (page - 1) * limit;

    const currentUser = await getCurrentUser();

    // Build conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(skills.name, `%${search}%`),
          ilike(
            sql<string>`coalesce(${skills.customDescription}, '')`,
            `%${search}%`
          ),
          ilike(skills.description, `%${search}%`)
        )
      );
    }

    if (categoryIdParam) {
      const categoryId = Number.parseInt(categoryIdParam, 10);
      if (!Number.isNaN(categoryId)) {
        conditions.push(eq(skills.categoryId, categoryId));
      }
    } else if (categorySlug) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, categorySlug))
        .limit(1);
      if (cat) {
        conditions.push(eq(skills.categoryId, cat.id));
      }
    }

    if (owner) {
      const [ownerUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, owner))
        .limit(1);
      if (ownerUser) {
        conditions.push(eq(skills.ownerId, ownerUser.id));
      }
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    // Sort
    const orderBy =
      sort === "stars"
        ? order === "asc"
          ? asc(skills.starCount)
          : desc(skills.starCount)
        : order === "asc"
          ? asc(skills.createdAt)
          : desc(skills.createdAt);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(skills)
      .where(whereClause);

    // Get skills with owner and category info
    const skillList = await db
      .select({
        id: skills.id,
        name: skills.name,
        description:
          sql<string>`coalesce(${skills.customDescription}, ${skills.description})`.as(
            "description"
          ),
        starCount: skills.starCount,
        downloadCount: skills.downloadCount,
        license: skills.license,
        createdAt: skills.createdAt,
        ownerUsername: users.username,
        ownerId: skills.ownerId,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(skills)
      .leftJoin(users, eq(skills.ownerId, users.id))
      .leftJoin(categories, eq(skills.categoryId, categories.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get starred status for current user
    let starredSkillIds: Set<string> = new Set();
    if (currentUser) {
      const userStars = await db
        .select({ skillId: stars.skillId })
        .from(stars)
        .where(eq(stars.userId, currentUser.userId));
      starredSkillIds = new Set(userStars.map((s) => s.skillId));
    }

    const skillsWithStarred = skillList.map((s) => ({
      ...s,
      isStarred: starredSkillIds.has(s.id),
    }));

    return NextResponse.json({
      skills: skillsWithStarred,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("List skills error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
