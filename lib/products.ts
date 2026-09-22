import { prisma } from "@/lib/prisma";
import type { Product } from "@/app/generated/prisma/client";

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
    featured: p.featured,
    active: p.active,
  };
}

/** كل المنتجات المتاحة للبيع (الأحدث أولاً) */
export async function getActiveProducts(): Promise<ProductView[]> {
  const rows = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toProductView);
}

/** المنتجات المميزة لصفحة الهبوط */
export async function getFeaturedProducts(limit = 6): Promise<ProductView[]> {
  const rows = await prisma.product.findMany({
    where: { active: true, featured: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toProductView);
}

/** منتج واحد معروض للبيع بالـ slug (لصفحة المنتج) */
export async function getProductBySlug(
  slug: string
): Promise<ProductView | null> {
  const row = await prisma.product.findFirst({
    where: { slug, active: true },
  });
  return row ? toProductView(row) : null;
}

// ===== أدمن (كل المنتجات بما فيها غير المعروضة) =====
export async function getAllProductsAdmin(): Promise<ProductView[]> {
  const rows = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toProductView);
}

export async function getProductByIdAdmin(
  id: string
): Promise<ProductView | null> {
  const row = await prisma.product.findUnique({ where: { id } });
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
  return prisma.product.create({
    data: { ...input, images: JSON.stringify(input.images) },
  });
}

export async function updateProduct(id: string, input: ProductInput) {
  return prisma.product.update({
    where: { id },
    data: { ...input, images: JSON.stringify(input.images) },
  });
}

export async function deleteProduct(id: string) {
  return prisma.product.delete({ where: { id } });
}

/** يتأكد إن الـ slug فريد (باستثناء منتج معيّن عند التعديل) */
export async function isSlugTaken(
  slug: string,
  exceptId?: string
): Promise<boolean> {
  const row = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !!row && row.id !== exceptId;
}
