"use client";

import { useState } from "react";
import { useCart, type CartItem } from "@/lib/cart";
import type { ProductView } from "@/lib/products";

type Props = {
  product: ProductView;
  variant?: "card" | "full";
};

// نبني عنصر السلة من المنتج
function toCartItem(p: ProductView): Omit<CartItem, "qty"> {
  return {
    productId: p.id,
    slug: p.slug,
    name: p.name,
    priceCents: p.priceCents,
    currency: p.currency,
    image: p.images[0] ?? "/products/placeholder.svg",
    type: p.type,
  };
}

export default function AddToCartButton({ product, variant = "card" }: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    add(toCartItem(product), variant === "full" ? qty : 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  }

  if (variant === "card") {
    return (
      <button
        type="button"
        onClick={handleAdd}
        className="shrink-0 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-95"
        aria-label={`أضف ${product.name} للسلة`}
      >
        {justAdded ? "تمت ✓" : "أضف للسلة"}
      </button>
    );
  }

  // النسخة الكاملة (صفحة المنتج): عدّاد كمية + زر كبير
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted">الكمية</span>
        <div className="flex items-center rounded-xl border border-line bg-surface">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className="grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-fg disabled:text-muted/40"
            aria-label="نقص الكمية"
          >
            −
          </button>
          <span className="tnum w-10 text-center font-bold text-fg">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-fg"
            aria-label="زود الكمية"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="w-full rounded-xl bg-brand-gradient px-8 py-3.5 text-center text-base font-bold text-white shadow-lg shadow-brand-600/25 transition-opacity hover:opacity-95 sm:w-auto"
      >
        {justAdded ? "تمت الإضافة للسلة ✓" : "أضف للسلة"}
      </button>

      {justAdded && (
        <p className="text-sm font-medium text-green-400">
          اتضاف للسلة. تقدر تكمّل تسوّق أو تروح للسلة (بتتفعّل في المرحلة الجاية).
        </p>
      )}
    </div>
  );
}
