// ========================
// Database / Domain Types
// ========================

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  profilePicture: string | null;
  phone: string | null;
  street: string | null;
  apartment: string | null;
  city: string | null;
  zipCode: string | null;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  bgColor: string;
  displayOrder: number;
}

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  price: number; // in cents
  imageUrl: string;
  rating: string;
  isAvailable: boolean;
}

export interface ModifierGroup {
  id: number;
  menuItemId: number;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
}

export interface Modifier {
  id: number;
  modifierGroupId: number;
  name: string;
  priceAdjustment: number; // in cents
}

export interface CartItem {
  id: number;
  userId: number;
  menuItemId: number;
  quantity: number;
  specialInstructions: string | null;
}

export interface CartItemModifier {
  id: number;
  cartItemId: number;
  modifierId: number;
}

export interface Order {
  id: number;
  userId: number;
  status: "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";
  total: number; // in cents
  deliveryAddress: string | null;
  deliveryPhone: string | null;
  tip: number; // in cents
  estimatedMinutes: number;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  menuItemId: number;
  quantity: number;
  unitPrice: number; // in cents
  itemName: string;
  specialInstructions: string | null;
}

export interface OrderItemModifier {
  id: number;
  orderItemId: number;
  modifierId: number;
  modifierName: string;
  priceAdjustment: number; // in cents
}

// ========================
// Joined / View Types
// ========================

export interface CartItemWithDetails {
  id: number;
  quantity: number;
  specialInstructions: string | null;
  menuItem: MenuItem;
  modifiers: (Modifier & { groupName: string })[];
}

export interface OrderWithItems {
  id: number;
  status: Order["status"];
  total: number;
  deliveryAddress: string | null;
  deliveryPhone: string | null;
  tip: number;
  estimatedMinutes: number;
  createdAt: string;
  items: (OrderItem & {
    modifiers: OrderItemModifier[];
  })[];
}

export interface MenuItemWithModifiers extends MenuItem {
  category?: Category;
  modifierGroups: (ModifierGroup & {
    modifiers: Modifier[];
  })[];
}

// ========================
// Auth Types
// ========================

export interface SessionUser {
  id: number;
  username: string;
  profilePicture: string | null;
}

// ========================
// Delivery Address
// ========================

export interface DeliveryAddress {
  street: string;
  apartment: string;
  city: string;
  zipCode: string;
  phone: string;
}
