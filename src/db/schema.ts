import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ========================
// USERS
// ========================
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  profilePicture: text("profile_picture"),
  phone: text("phone"),
  street: text("street"),
  apartment: text("apartment"),
  city: text("city"),
  zipCode: text("zip_code"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// ========================
// SESSIONS (for Lucia)
// ========================
export const sessions = sqliteTable("sessions", {
  id: text("id").notNull().primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at").notNull(),
});

// ========================
// CATEGORIES
// ========================
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  bgColor: text("bg_color").notNull().default("#f5f5f5"),
  displayOrder: integer("display_order").notNull().default(0),
});

// ========================
// MENU ITEMS
// ========================
export const menuItems = sqliteTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // in cents
  imageUrl: text("image_url").notNull(),
  rating: text("rating").notNull().default("4.5"),
  isAvailable: integer("is_available", { mode: "boolean" }).notNull().default(true),
});

// ========================
// MODIFIER GROUPS
// ========================
export const modifierGroups = sqliteTable("modifier_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  menuItemId: integer("menu_item_id")
    .notNull()
    .references(() => menuItems.id),
  name: text("name").notNull(),
  required: integer("required", { mode: "boolean" }).notNull().default(false),
  minSelect: integer("min_select").notNull().default(0),
  maxSelect: integer("max_select").notNull().default(1),
});

// ========================
// MODIFIERS
// ========================
export const modifiers = sqliteTable("modifiers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modifierGroupId: integer("modifier_group_id")
    .notNull()
    .references(() => modifierGroups.id),
  name: text("name").notNull(),
  priceAdjustment: integer("price_adjustment").notNull().default(0), // in cents
});

// ========================
// CART ITEMS
// ========================
export const cartItems = sqliteTable("cart_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  menuItemId: integer("menu_item_id")
    .notNull()
    .references(() => menuItems.id),
  quantity: integer("quantity").notNull().default(1),
  specialInstructions: text("special_instructions"),
});

// ========================
// CART ITEM MODIFIERS
// ========================
export const cartItemModifiers = sqliteTable("cart_item_modifiers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cartItemId: integer("cart_item_id")
    .notNull()
    .references(() => cartItems.id),
  modifierId: integer("modifier_id")
    .notNull()
    .references(() => modifiers.id),
});

// ========================
// ORDERS
// ========================
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("confirmed"),
  total: integer("total").notNull(),
  deliveryAddress: text("delivery_address"),
  deliveryPhone: text("delivery_phone"),
  tip: integer("tip").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").notNull().default(30),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// ========================
// ORDER ITEMS
// ========================
export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  menuItemId: integer("menu_item_id")
    .notNull()
    .references(() => menuItems.id),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  itemName: text("item_name").notNull(),
  specialInstructions: text("special_instructions"),
});

// ========================
// ORDER ITEM MODIFIERS
// ========================
export const orderItemModifiers = sqliteTable("order_item_modifiers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderItemId: integer("order_item_id")
    .notNull()
    .references(() => orderItems.id),
  modifierId: integer("modifier_id")
    .notNull()
    .references(() => modifiers.id),
  modifierName: text("modifier_name").notNull(), // snapshot
  priceAdjustment: integer("price_adjustment").notNull(), // snapshot in cents
});
