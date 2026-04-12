import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("menu_items")
      .select("slug, image_url")
      .not("image_url", "is", null);

    if (error) {
      console.error("[menu-images] Supabase error:", error);
      return NextResponse.json({}, { status: 500 });
    }

    const imageMap: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.slug && row.image_url) {
        imageMap[row.slug] = row.image_url;
      }
    }

    return NextResponse.json(imageMap, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    console.error("[menu-images] Error:", err);
    return NextResponse.json({}, { status: 500 });
  }
}
