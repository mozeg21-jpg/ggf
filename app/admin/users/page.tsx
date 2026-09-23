import db from "@/lib/db";

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  ordersCount: number;
};

export default async function AdminUsers() {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, COUNT(o.id) as ordersCount
    FROM User u
    LEFT JOIN "Order" o ON u.id = o.userId
    GROUP BY u.id
    ORDER BY u.createdAt DESC
  `).all() as UserRow[];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-extrabold text-fg">العملاء</h2>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-muted">
          لسه مفيش عملاء مسجّلين.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="font-bold text-fg">
                  {u.name}
                  {u.role === "admin" && (
                    <span className="ms-2 rounded-full bg-brand-600/20 px-2 py-0.5 text-xs text-brand-200">
                      أدمن
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted">
                  {u.email}
                  {u.phone && <span className="tnum"> · {u.phone}</span>}
                </p>
              </div>
              <span className="tnum shrink-0 rounded-full border border-line bg-bg px-3 py-1 text-sm text-fg">
                {u.ordersCount} طلب
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
