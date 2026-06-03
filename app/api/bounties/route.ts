import { NextRequest, NextResponse } from "next/server";
import { BOUNTIES } from "@/lib/mock-data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const difficulty = searchParams.get("difficulty");
  const category = searchParams.get("category");

  let result = BOUNTIES;
  if (difficulty) result = result.filter((b) => b.difficulty === difficulty);
  if (category) result = result.filter((b) => b.category === category);

  return NextResponse.json({ bounties: result, total: result.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title || !body.xpReward) {
    return NextResponse.json({ error: "title and xpReward are required" }, { status: 400 });
  }
  const bounty = { id: `bnt_${Date.now()}`, ...body, isActive: true, completions: 0, createdAt: new Date().toISOString() };
  return NextResponse.json({ bounty }, { status: 201 });
}
