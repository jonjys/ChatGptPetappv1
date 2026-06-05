import { NextRequest, NextResponse } from "next/server";
import { FEED_POSTS } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({ posts: FEED_POSTS, total: FEED_POSTS.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.content || !body.type) {
    return NextResponse.json({ error: "content and type are required" }, { status: 400 });
  }
  const newPost = { id: `post_${Date.now()}`, ...body, createdAt: new Date().toISOString() };
  return NextResponse.json({ post: newPost }, { status: 201 });
}
