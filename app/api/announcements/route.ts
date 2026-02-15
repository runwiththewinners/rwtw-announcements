import { NextRequest, NextResponse } from "next/server";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redisGet(key: string) {
  const res = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  });
  const data = await res.json();
  return data.result;
}

async function redisSet(key: string, value: string) {
  const res = await fetch(`${REDIS_URL}/set/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: value,
  });
  return res.ok;
}

async function redisDel(key: string) {
  const res = await fetch(`${REDIS_URL}/del/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  return res.ok;
}

export const dynamic = "force-dynamic";

// GET — return all announcements
export async function GET() {
  try {
    const indexRaw = await redisGet("announcements:index");
    const ids: string[] = indexRaw ? JSON.parse(indexRaw) : [];

    const announcements = [];
    for (const id of ids) {
      const raw = await redisGet(`announcements:${id}`);
      if (raw) {
        announcements.push(JSON.parse(raw));
      }
    }

    // Sort by date descending
    announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ announcements });
  } catch (e: any) {
    console.error("[ANNOUNCEMENTS] Get error:", e);
    return NextResponse.json({ announcements: [] });
  }
}

// POST — create new announcement
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, title, body: content, ctaText, ctaUrl, pinned } = body;

    if (!type || !title || !content) {
      return NextResponse.json({ error: "type, title, and body are required" }, { status: 400 });
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const announcement = {
      id,
      type,
      title,
      body: content,
      ctaText: ctaText || "",
      ctaUrl: ctaUrl || "",
      pinned: pinned || false,
      createdAt: new Date().toISOString(),
    };

    await redisSet(`announcements:${id}`, JSON.stringify(announcement));

    // Update index
    const indexRaw = await redisGet("announcements:index");
    const ids: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    ids.push(id);
    await redisSet("announcements:index", JSON.stringify(ids));

    return NextResponse.json({ success: true, announcement });
  } catch (e: any) {
    console.error("[ANNOUNCEMENTS] Post error:", e);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

// DELETE — delete an announcement
export async function DELETE(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await redisDel(`announcements:${id}`);

    const indexRaw = await redisGet("announcements:index");
    const ids: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    const newIds = ids.filter((i) => i !== id);
    await redisSet("announcements:index", JSON.stringify(newIds));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[ANNOUNCEMENTS] Delete error:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

// PUT — update an announcement (pin/unpin)
export async function PUT(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const raw = await redisGet(`announcements:${id}`);
    if (!raw) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const announcement = { ...JSON.parse(raw), ...updates };
    await redisSet(`announcements:${id}`, JSON.stringify(announcement));

    return NextResponse.json({ success: true, announcement });
  } catch (e: any) {
    console.error("[ANNOUNCEMENTS] Update error:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
