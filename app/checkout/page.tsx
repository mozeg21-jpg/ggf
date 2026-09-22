import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getBumpOffer } from "@/lib/settings";
import CheckoutClient from "@/components/CheckoutClient";

export const metadata: Metadata = { title: "إتمام الطلب" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [user, bump] = await Promise.all([getCurrentUser(), getBumpOffer()]);
  return (
    <CheckoutClient
      user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
      bump={bump}
    />
  );
}
