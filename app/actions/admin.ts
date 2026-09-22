"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { saveImage } from "@/lib/upload";
import { updateOrderStatus } from "@/lib/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  isSlugTaken,
  type ProductInput,
} from "@/lib/products";
import { cleanStr, isNonEmpty } from "@/lib/validation";

// ===== الطلبات =====
export async function setOrderStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = cleanStr(formData.get("orderId"), 40);
  const status = cleanStr(formData.get("status"), 20);
  if (!id || !ORDER_STATUSES.includes(status as OrderStatus)) return;
  await updateOrderStatus(id, status as OrderStatus);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

// ===== المنتجات =====
export type ProductFormState = { error?: string };

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-") // أي رمز غير حرف/رقم → شرطة
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function egpToCents(v: string): number | null {
  const n = Number(v.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

async function parseProductForm(
  formData: FormData,
  exceptId?: string
): Promise<{ data?: ProductInput; error?: string }> {
  const name = cleanStr(formData.get("name"), 120);
  if (!isNonEmpty(name, 2)) return { error: "اكتب اسم المنتج." };

  let slug = cleanStr(formData.get("slug"), 80);
  if (!slug) slug = slugify(name);
  else slug = slugify(slug);
  if (!slug) return { error: "الـ slug غير صالح، جرّب اسم تاني." };
  if (await isSlugTaken(slug, exceptId))
    return { error: `الـ slug "${slug}" مستخدم بالفعل، غيّره.` };

  const priceCents = egpToCents(cleanStr(formData.get("price"), 20));
  if (priceCents === null) return { error: "السعر غير صحيح." };

  const compareRaw = cleanStr(formData.get("compareAt"), 20);
  const compareAtCents = compareRaw ? egpToCents(compareRaw) : null;
  if (compareRaw && compareAtCents === null)
    return { error: "السعر قبل الخصم غير صحيح." };

  const type = cleanStr(formData.get("type"), 20) === "digital" ? "digital" : "physical";
  const shortDesc = cleanStr(formData.get("shortDesc"), 160) || null;
  const description = cleanStr(formData.get("description"), 4000);
  const featured = formData.get("featured") === "on";
  const active = formData.get("active") === "on";

  // الصور: رابط لكل سطر + صورة مرفوعة (اختياري)
  const urls = cleanStr(formData.get("imageUrls"), 4000)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const images: string[] = [];
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      images.push(await saveImage(file, "products"));
    } catch (e) {
      return { error: e instanceof Error ? e.message : "فشل رفع الصورة." };
    }
  }
  images.push(...urls);

  return {
    data: {
      slug,
      name,
      shortDesc,
      description,
      priceCents,
      compareAtCents,
      type,
      images,
      featured,
      active,
    },
  };
}

export async function createProductAction(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireAdmin();
  const { data, error } = await parseProductForm(formData);
  if (error || !data) return { error };
  await createProduct(data);
  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function updateProductAction(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireAdmin();
  const id = cleanStr(formData.get("id"), 40);
  if (!id) return { error: "منتج غير معروف." };
  const { data, error } = await parseProductForm(formData, id);
  if (error || !data) return { error };
  await updateProduct(id, data);
  revalidatePath("/admin/products");
  revalidatePath(`/products/${data.slug}`);
  revalidatePath("/");
  redirect("/admin/products");
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = cleanStr(formData.get("id"), 40);
  if (id) {
    await deleteProduct(id);
    revalidatePath("/admin/products");
    revalidatePath("/");
  }
}
