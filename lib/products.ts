import "server-only";
import db from "@/lib/db";

export type Product = {
  id: string;
  slug: string;
  name: string;
  shortDesc: string | null;
  description: string;
  priceCents: number;
  compareAtCents: number | null;
  currency: string;
  type: string;
  images: string; // مصفوفة الصور كـ JSON string
  featured: boolean | number;
  active: boolean | number;
  createdAt?: string;
  updatedAt?: string;
};

// شكل المنتج بعد التجهيز للعرض (الصور اتحوّلت من JSON لمصفوفة)
export type ProductView = {
  id: string;
  slug: string;
  name: string;
  shortDesc: string | null;
  description: string;
  priceCents: number;
  compareAtCents: number | null;
  currency: string;
  type: "physical" | "digital";
  images: string[];
  featured: boolean;
  active: boolean;
};

/** يحوّل صف قاعدة البيانات لشكل جاهز للعرض */
export function toProductView(p: Product): ProductView {
  let images: string[] = [];
  try {
    const parsed = JSON.parse(p.images);
    if (Array.isArray(parsed)) images = parsed.filter((x) => typeof x === "string");
  } catch {
    images = [];
  }
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDesc: p.shortDesc,
    description: p.description,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    currency: p.currency,
    type: p.type === "digital" ? "digital" : "physical",
    images,
    featured: !!p.featured,
    active: !!p.active,
  };
}

/** كل المنتجات المتاحة للبيع (الأحدث أولاً) */
export async function getActiveProducts(): Promise<ProductView[]> {
  const rows = db.prepare(`
    SELECT * FROM Product 
    WHERE active = 1 
    ORDER BY featured DESC, createdAt DESC
  `).all() as Product[];
  return rows.map(toProductView);
}

/** المنتجات المميزة لصفحة الهبوط */
export async function getFeaturedProducts(limit = 6): Promise<ProductView[]> {
  const rows = db.prepare(`
    SELECT * FROM Product 
    WHERE active = 1 AND featured = 1 
    ORDER BY createdAt DESC 
    LIMIT ?
  `).all(limit) as Product[];
  return rows.map(toProductView);
}

/** منتج واحد معروض للبيع بالـ slug (لصفحة المنتج) */
export async function getProductBySlug(
  slug: string
): Promise<ProductView | null> {
  const row = db.prepare(`
    SELECT * FROM Product 
    WHERE slug = ? AND active = 1
  `).get(slug) as Product | undefined;
  return row ? toProductView(row) : null;
}

// ===== أدمن (كل المنتجات بما فيها غير المعروضة) =====
export async function getAllProductsAdmin(): Promise<ProductView[]> {
  const rows = db.prepare(`
    SELECT * FROM Product 
    ORDER BY createdAt DESC
  `).all() as Product[];
  return rows.map(toProductView);
}

export async function getProductByIdAdmin(
  id: string
): Promise<ProductView | null> {
  const row = db.prepare(`
    SELECT * FROM Product 
    WHERE id = ?
  `).get(id) as Product | undefined;
  return row ? toProductView(row) : null;
}

export type ProductInput = {
  slug: string;
  name: string;
  shortDesc: string | null;
  description: string;
  priceCents: number;
  compareAtCents: number | null;
  type: string;
  images: string[];
  featured: boolean;
  active: boolean;
};

export async function createProduct(input: ProductInput) {
  const id = "prod_" + Math.random().toString(36).substring(2, 15);
  db.prepare(`
    INSERT INTO Product (id, slug, name, shortDesc, description, priceCents, compareAtCents, type, images, featured, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.slug,
    input.name,
    input.shortDesc,
    input.description,
    input.priceCents,
    input.compareAtCents,
    input.type,
    JSON.stringify(input.images),
    input.featured ? 1 : 0,
    input.active ? 1 : 0
  );
  return { id };
}

export async function updateProduct(id: string, input: ProductInput) {
  db.prepare(`
    UPDATE Product
    SET slug = ?, name = ?, shortDesc = ?, description = ?, priceCents = ?, compareAtCents = ?, type = ?, images = ?, featured = ?, active = ?, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    input.slug,
    input.name,
    input.shortDesc,
    input.description,
    input.priceCents,
    input.compareAtCents,
    input.type,
    JSON.stringify(input.images),
    input.featured ? 1 : 0,
    input.active ? 1 : 0,
    id
  );
  return { id };
}

export async function deleteProduct(id: string) {
  db.prepare("DELETE FROM Product WHERE id = ?").run(id);
  return { id };
}

/** يتأكد إن الـ slug فريد (باستثناء منتج معيّن عند التعديل) */
export async function isSlugTaken(
  slug: string,
  exceptId?: string
): Promise<boolean> {
  const row = db.prepare("SELECT id FROM Product WHERE slug = ?").get(slug) as { id: string } | undefined;
  return !!row && row.id !== exceptId;
}
