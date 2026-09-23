import "server-only";
import db from "@/lib/db";

// ===== حالات الطلب =====
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "delivered",
  "cancelled",
  "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "قيد المراجعة",
  confirmed: "مؤكّد",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  returned: "مرتجع", // العميل رجّع الطلب وفق سياسة الاسترجاع (/policy)
};

// خطوات التقدّم المعروضة في خط الزمن
export const STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "delivered"];

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as OrderStatus] ?? status;
}

// ===== توليد رقم طلب مقروء وفريد =====
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // بدون أحرف ملتبسة

function randomCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

async function generateOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = `SYX-${randomCode(6)}`;
    const exists = db.prepare(`SELECT id FROM "Order" WHERE orderNumber = ?`).get(candidate);
    if (!exists) return candidate;
  }
  // احتياطي شبه مستحيل يتكرر
  return `SYX-${randomCode(9)}`;
}

// ===== إنشاء طلب =====
export type NewOrderItem = {
  productId: string | null;
  name: string;
  priceCents: number;
  qty: number;
  type: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string | null;
  name: string;
  priceCents: number;
  qty: number;
  type: string;
};

export type OrderView = {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: string | null;
  paymentMethod: string;
  status: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  proofImage: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
  } | null;
};

export type NewOrderInput = {
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: string | null;
  paymentMethod: "cash" | "transfer";
  proofImage: string | null;
  note: string | null;
  shippingCents: number; // تكلفة الشحن المحسوبة (صفر للرقمي بالكامل)
  items: NewOrderItem[];
};

export async function createOrder(input: NewOrderInput): Promise<OrderView> {
  const subtotalCents = input.items.reduce(
    (sum, i) => sum + i.priceCents * i.qty,
    0
  );
  const orderNumber = await generateOrderNumber();
  const orderId = "ord_" + Math.random().toString(36).substring(2, 15);
  const totalCents = subtotalCents + input.shippingCents;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO "Order" (id, orderNumber, userId, customerName, customerPhone, customerEmail, address, paymentMethod, status, subtotalCents, shippingCents, totalCents, proofImage, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      orderNumber,
      input.userId,
      input.customerName,
      input.customerPhone,
      input.customerEmail,
      input.address,
      input.paymentMethod,
      "pending",
      subtotalCents,
      input.shippingCents,
      totalCents,
      input.proofImage,
      input.note
    );

    const insertItem = db.prepare(`
      INSERT INTO OrderItem (id, orderId, productId, name, priceCents, qty, type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of input.items) {
      const itemId = "item_" + Math.random().toString(36).substring(2, 15);
      insertItem.run(
        itemId,
        orderId,
        item.productId,
        item.name,
        item.priceCents,
        item.qty,
        item.type
      );
    }
  })();

  const createdOrder = await getOrderById(orderId);
  if (!createdOrder) {
    throw new Error("Failed to retrieve created order");
  }
  return createdOrder;
}

// ===== قراءة =====
export async function getOrderByNumber(orderNumber: string): Promise<OrderView | null> {
  const order = db.prepare(`SELECT * FROM "Order" WHERE UPPER(orderNumber) = ?`).get(orderNumber.trim().toUpperCase()) as any;
  if (!order) return null;
  
  const items = db.prepare("SELECT * FROM OrderItem WHERE orderId = ?").all(order.id) as OrderItem[];
  return { ...order, items };
}

export async function getUserOrders(userId: string): Promise<OrderView[]> {
  const orders = db.prepare(`SELECT * FROM "Order" WHERE userId = ? ORDER BY createdAt DESC`).all(userId) as any[];
  return orders.map((order) => {
    const items = db.prepare("SELECT * FROM OrderItem WHERE orderId = ?").all(order.id) as OrderItem[];
    return { ...order, items };
  });
}

// ===== أدمن =====
export async function getAllOrders(status?: string): Promise<OrderView[]> {
  let orders: any[];
  if (status && ORDER_STATUSES.includes(status as OrderStatus)) {
    orders = db.prepare(`SELECT * FROM "Order" WHERE status = ? ORDER BY createdAt DESC`).all(status) as any[];
  } else {
    orders = db.prepare(`SELECT * FROM "Order" ORDER BY createdAt DESC`).all() as any[];
  }
  return orders.map((order) => {
    const items = db.prepare("SELECT * FROM OrderItem WHERE orderId = ?").all(order.id) as OrderItem[];
    return { ...order, items };
  });
}

export async function getOrderById(id: string): Promise<OrderView | null> {
  const order = db.prepare(`SELECT * FROM "Order" WHERE id = ?`).get(id) as any;
  if (!order) return null;

  const items = db.prepare("SELECT * FROM OrderItem WHERE orderId = ?").all(id) as OrderItem[];
  const user = order.userId ? db.prepare("SELECT id, name, email, phone, role FROM User WHERE id = ?").get(order.userId) as any : null;
  return { ...order, items, user };
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  db.prepare(`UPDATE "Order" SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(status, id);
  return { id, status };
}

/** إحصائيات للوحة التحكم */
export async function getStats() {
  const orders = db.prepare(`SELECT status, subtotalCents, totalCents FROM "Order"`).all() as any[];
  const productsCountRow = db.prepare("SELECT COUNT(*) as count FROM Product").get() as { count: number };
  const usersCountRow = db.prepare("SELECT COUNT(*) as count FROM User WHERE role = 'customer'").get() as { count: number };

  const byStatus: Record<string, number> = {};
  let revenueCents = 0; // إيراد الطلبات المؤكّدة/المسلّمة (المرتجع والملغي مش محسوبين)
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    if (o.status === "confirmed" || o.status === "delivered") {
      revenueCents += o.totalCents || o.subtotalCents;
    }
  }

  return {
    ordersCount: orders.length,
    productsCount: productsCountRow.count,
    customersCount: usersCountRow.count,
    revenueCents,
    pending: byStatus["pending"] ?? 0,
    confirmed: byStatus["confirmed"] ?? 0,
    delivered: byStatus["delivered"] ?? 0,
    cancelled: byStatus["cancelled"] ?? 0,
    returned: byStatus["returned"] ?? 0,
  };
}
