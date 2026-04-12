import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { menuItems, modifierGroups, modifiers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatPrice } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const item = db
      .select({ id: menuItems.id, name: menuItems.name, price: menuItems.price })
      .from(menuItems)
      .where(eq(menuItems.slug, slug))
      .get();

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const groups = db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.menuItemId, item.id))
      .all();

    if (groups.length === 0) {
      return NextResponse.json({
        itemName: item.name,
        basePrice: formatPrice(item.price),
        basePriceCents: item.price,
        groups: [],
      }, {
        headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
      });
    }

    const result = groups.map((g) => {
      const opts = db
        .select()
        .from(modifiers)
        .where(eq(modifiers.modifierGroupId, g.id))
        .all();

      return {
        id: g.id,
        name: g.name,
        required: Boolean(g.required),
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        options: opts.map((o) => ({
          id: o.id,
          name: o.name,
          priceDelta: o.priceAdjustment,
          priceDisplay: o.priceAdjustment === 0 ? "Free" : `+${formatPrice(o.priceAdjustment)}`,
        })),
      };
    });

    return NextResponse.json({
      itemName: item.name,
      basePrice: formatPrice(item.price),
      basePriceCents: item.price,
      groups: result,
    }, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("[Modifiers API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch modifiers" },
      { status: 500 },
    );
  }
}
