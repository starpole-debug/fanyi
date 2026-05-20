"use server";

import { redirect } from "next/navigation";
import { createAdminSession, validateAdminCredentials } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");

  if (!validateAdminCredentials(username, password)) {
    redirect("/admin/login?error=1");
  }

  await createAdminSession(username);
  redirect("/admin");
}
