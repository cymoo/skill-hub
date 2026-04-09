import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { categorySchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(categories.name);
    return NextResponse.json({ categories: allCategories });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = categorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description } = result.data;
    const slug = slugify(name);

    // Check if slug already exists
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 }
      );
    }

    const [category] = await db
      .insert(categories)
      .values({ name, slug, description })
      .returning();

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
