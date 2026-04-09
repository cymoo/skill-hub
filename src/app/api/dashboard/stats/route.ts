import { NextResponse } from "next/server";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db
      .select({
        totalSkills: sql<number>`count(*)`,
        totalStars: sql<number>`coalesce(sum(${skills.starCount}), 0)`,
        totalDownloads: sql<number>`coalesce(sum(${skills.downloadCount}), 0)`,
      })
      .from(skills)
      .where(eq(skills.ownerId, user.userId));

    return NextResponse.json({
      totalSkills: Number(result[0].totalSkills),
      totalStars: Number(result[0].totalStars),
      totalDownloads: Number(result[0].totalDownloads),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
