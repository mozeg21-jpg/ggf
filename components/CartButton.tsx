"use client";

import { useCart } from "@/lib/cart";

export default function CartButton() {
  const { count, ready, toggleCart } = useCart();
  // قبل التحميل من localStorage نعرض 0 لتفادي اختلاف SSR/CSR
  const badge = ready ? count : 0;

  return (
    <button
      type="button"
      onClick={toggleCart}
      aria-label={`السلة (${badge})`}
      className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-fg transition-colors hover:bg-surface-2"
    >
      <CartIcon />
      {badge > 0 && (
        <span className="tnum absolute -top-1.5 -left-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-gradient px-1 text-[11px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function CartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
      <path d="M2 3h2l2.4 12.3a2 2 0 0 0 2 1.7h8.7a2 2 0 0 0 2-1.6L23 7H5.1" />
    </svg>
  );
}
