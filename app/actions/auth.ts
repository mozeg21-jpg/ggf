"use server";

import { redirect } from "next/navigation";
import db from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
} from "@/lib/auth";
import { isValidEmail, isValidPhone, cleanStr } from "@/lib/validation";

export type AuthState = { error?: string };

function safeRedirect(target: string): string {
  // نسمح فقط بمسارات داخلية (نتفادى open redirect)
  return target.startsWith("/") && !target.startsWith("//") ? target : "/account";
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = cleanStr(formData.get("name"), 80);
  const email = cleanStr(formData.get("email"), 120).toLowerCase();
  const phone = cleanStr(formData.get("phone"), 20);
  const password = typeof formData.get("password") === "string"
    ? (formData.get("password") as string)
    : "";
  const redirectTo = safeRedirect(cleanStr(formData.get("redirectTo"), 200) || "/account");

  if (name.length < 2) return { error: "اكتب اسمك بشكل صحيح." };
  if (!isValidEmail(email)) return { error: "الإيميل غير صحيح." };
  if (phone && !isValidPhone(phone)) return { error: "رقم الموبايل غير صحيح." };
  if (password.length < 6)
    return { error: "كلمة السر لازم تكون 6 حروف على الأقل." };

  const existing = db.prepare("SELECT id FROM User WHERE email = ?").get(email);
  if (existing) return { error: "فيه حساب بالإيميل ده بالفعل. سجّل دخول." };

  const userId = "user_" + Math.random().toString(36).substring(2, 15);
  const passwordHash = await hashPassword(password);
  
  db.prepare(`
    INSERT INTO User (id, name, email, phone, passwordHash, role)
    VALUES (?, ?, ?, ?, ?, 'customer')
  `).run(userId, name, email, phone || null, passwordHash);

  await createSession(userId);
  redirect(redirectTo);
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = cleanStr(formData.get("email"), 120).toLowerCase();
  const password = typeof formData.get("password") === "string"
    ? (formData.get("password") as string)
    : "";
  const redirectTo = safeRedirect(cleanStr(formData.get("redirectTo"), 200) || "/account");

  if (!isValidEmail(email) || !password)
    return { error: "ادخل إيميل وكلمة سر صحيحين." };

  const user = db.prepare("SELECT * FROM User WHERE email = ?").get(email) as {
    id: string;
    passwordHash: string;
  } | undefined;

  // نفس رسالة الخطأ في الحالتين (ما نكشفش إذا الإيميل موجود)
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "الإيميل أو كلمة السر غير صحيحة." };
  }

  await createSession(user.id);
  redirect(redirectTo);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
