import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(
      `https://api.whop.com/api/v5/app/members?per=1&page=1`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error("[MEMBERS] API error:", response.status, await response.text());
      return NextResponse.json({ count: null });
    }

    const data = await response.json();
    const totalCount = data.pagination?.total_count || null;

    console.log("[MEMBERS] Total count:", totalCount);
    return NextResponse.json({ count: totalCount });
  } catch (e: any) {
    console.error("[MEMBERS] Error:", e);
    return NextResponse.json({ count: null });
  }
}
