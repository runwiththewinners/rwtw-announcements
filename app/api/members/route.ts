import { NextResponse } from "next/server";
import Whop from "@whop/sdk";

export const dynamic = "force-dynamic";

const whopsdk = new Whop({
  apiKey: process.env.WHOP_API_KEY,
  appID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
});

export async function GET() {
  try {
    // Try to get member count from Whop company memberships
    const companyId = process.env.WHOP_COMPANY_ID;
    if (!companyId) {
      return NextResponse.json({ count: null, error: "No company ID configured" });
    }

    // Use Whop SDK to list memberships and count
    // We'll paginate through and count valid memberships
    let totalMembers = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await fetch(
          `https://api.whop.com/api/v5/company/memberships?per=${100}&page=${page}&valid=true`,
          {
            headers: {
              Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          console.error("[MEMBERS] API error:", response.status, await response.text());
          break;
        }

        const data = await response.json();
        const memberships = data.data || [];
        totalMembers += memberships.length;

        if (memberships.length < 100) {
          hasMore = false;
        } else {
          page++;
        }
      } catch (e) {
        console.error("[MEMBERS] Fetch page error:", e);
        hasMore = false;
      }
    }

    console.log("[MEMBERS] Total count:", totalMembers);
    return NextResponse.json({ count: totalMembers });
  } catch (e: any) {
    console.error("[MEMBERS] Error:", e);
    return NextResponse.json({ count: null, error: "Failed to fetch member count" });
  }
}
