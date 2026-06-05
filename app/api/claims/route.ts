import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.bountyId || !body.userId) {
    return NextResponse.json({ error: "bountyId and userId are required" }, { status: 400 });
  }
  const claim = {
    id: `claim_${Date.now()}`,
    bountyId: body.bountyId,
    userId: body.userId,
    status: "claimed",
    claimedAt: new Date().toISOString(),
  };
  return NextResponse.json({ claim }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  return NextResponse.json({ claims: [], userId });
}
