import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { supabaseServer } from "@/lib/supabase/server";
import { embedText, embedBatch } from "./embeddings";
import { upsertVectors } from "./pinecone";

// TODO: Create a function to fetch all menu items from Supabase
// Hint: Use supabaseServer.from("menu_items").select(...)
// Hint: Select: id, name, description, price, category_id, is_vegetarian, is_vegan, is_gluten_free, allergens
// Hint: Return the full array of items

const fetchMenuItems = async () => {

  // Hint: Use supabaseServer.from("menu_items").select(...)
// Hint: Select: id, name, description, price, category_id, is_vegetarian, is_vegan, is_gluten_free, allergens
// Hint: Return the full array of items
    const { data, error } = await supabaseServer.from("menu_items").select("*");
    if (error) {
        console.error("Error fetching menu items:", error);
        throw error;
    }
    return data;
};

// TODO: Create a function to seed vectors
// Hint: 1. Fetch all menu items
// Hint: 2. For each item, create a text description (name + description + dietary flags)
// Hint: 3. Call embedBatch() to embed all descriptions at once (faster than one-by-one)
// Hint: 4. Map embeddings to records format: { id: item.id, values: embedding, metadata: { name, category_id, price, ... } }
// Hint: 5. Call upsertVectors(records) to store in Pinecone
// Hint: 6. Log success/failure

export const seedVectors = async () => {
  try {
// Hint: 1. Fetch all menu items
// Hint: 2. For each item, create a text description (name + description + dietary flags)
// Hint: 3. Call embedBatch() to embed all descriptions at once (faster than one-by-one)
// Hint: 4. Map embeddings to records format: { id: item.id, values: embedding, metadata: { name, category_id, price, ... } }
// Hint: 5. Call upsertVectors(records) to store in Pinecone
// Hint: 6. Log success/failure
    const items = await fetchMenuItems();
    const descriptions = items.map(item => {
        const dietaryFlags = [
            item.is_vegetarian ? "vegetarian" : null,
            item.is_vegan ? "vegan" : null,
            item.is_gluten_free ? "gluten-free" : null,
        ].filter(Boolean).join(", ");
        return `${item.name}: ${item.description} (${dietaryFlags})`;
    });

    const embeddings = await embedBatch(descriptions);

    const records = items.map((item, idx) => ({
        id: String(item.id),
        values: embeddings[idx],
        metadata: {
            name: item.name,
            category_id: item.category_id,
            price: item.price,
            is_vegetarian: item.is_vegetarian,
            is_vegan: item.is_vegan,
            is_gluten_free: item.is_gluten_free,
            allergens: item.allergens,
        },
    }));

    await upsertVectors(records);

    console.log("✅ Vectors seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding vectors:", error);
    throw error;
  }
};

// Run the seed script directly
seedVectors()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
