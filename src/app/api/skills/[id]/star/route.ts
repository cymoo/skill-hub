import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills, stars } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check skill exists
    const [skill] = await db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.id, id))
      .limit(1);

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Check if already starred
    const [existingStar] = await db
      .select()
      .from(stars)
      .where(and(eq(stars.userId, user.userId), eq(stars.skillId, id)))
      .limit(1);

    if (existingStar) {
      return NextResponse.json({ message: "Already starred" });
    }

    // Add star
    await db.insert(stars).values({
      userId: user.userId,
      skillId: id,
    });

    // Increment star count
    await db
      .update(skills)
      .set({ starCount: sql`${skills.starCount} + 1` })
      .where(eq(skills.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Star skill error:", error);
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

    const [existingStar] = await db
      .select()
      .from(stars)
      .where(and(eq(stars.userId, user.userId), eq(stars.skillId, id)))
      .limit(1);

    if (!existingStar) {
      return NextResponse.json({ message: "Not starred" });
    }

    // Remove star
    await db
      .delete(stars)
      .where(and(eq(stars.userId, user.userId), eq(stars.skillId, id)));

    // Decrement star count
    await db
      .update(skills)
      .set({ starCount: sql`${skills.starCount} - 1` })
      .where(eq(skills.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unstar skill error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
