import { NextRequest, NextResponse } from "next/server";
import { MY_PET } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({ pet: MY_PET });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const updated = { ...MY_PET, ...body, updatedAt: new Date().toISOString() };
  return NextResponse.json({ pet: updated });
}
