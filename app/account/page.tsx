import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserOrders } from "@/lib/orders";
import { logoutAction } from "@/app/actions/auth";
import { formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/components/OrderStatus";

export const metadata: Metadata = { title: "حسابي" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const orders = await getUserOrders(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* رأس الحساب */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-6">
        <div>
          <p className="text-sm text-muted">أهلاً</p>
          <h1 className="text-xl font-extrabold text-fg">{user.name}</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-xl border border-line bg-bg px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2"
          >
            تسجيل خروج
          </button>
        </form>
      </div>

      {/* الطلبات */}
      <h2 className="mt-8 mb-4 text-lg font-extrabold text-fg">طلباتي</h2>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <p className="text-muted">لسه معملتش أي طلب.</p>
          <Link
            href="/#products"
            className="mt-4 inline-block rounded-xl bg-brand-gradient px-6 py-2.5 font-semibold text-white transition-opacity hover:opacity-95"
          >
            ابدأ التسوّق
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.orderNumber}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand-600/50"
              >
                <div>
                  <p className="tnum font-bold text-fg">{order.orderNumber}</p>
                  <p className="tnum text-sm text-muted">
                    {order.items.length} منتج · {formatPrice(order.totalCents || order.subtotalCents)}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
