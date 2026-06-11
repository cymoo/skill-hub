import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skillVersions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const versions = await db
      .select()
      .from(skillVersions)
      .where(eq(skillVersions.skillId, id))
      .orderBy(desc(skillVersions.createdAt));

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("List versions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
