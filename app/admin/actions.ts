"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession, requireAdmin } from "@/lib/auth";
import { saveSettings, updateTranslationReview, deleteTranslation } from "@/lib/storage";
import { ProviderKey, TranslationStatus } from "@/lib/types";

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function updateSettingsAction(formData: FormData) {
  await requireAdmin();

  await saveSettings({
    selectedProvider: String(formData.get("selectedProvider")) as ProviderKey,
    customProviderLabel: String(formData.get("customProviderLabel") || "").trim(),
    customBaseUrl: String(formData.get("customBaseUrl") || "").trim(),
    customApiKeyEnv: String(formData.get("customApiKeyEnv") || "").trim(),
    translateModel: String(formData.get("translateModel") || "").trim(),
    polishModel: String(formData.get("polishModel") || "").trim(),
    scoringModel: String(formData.get("scoringModel") || "").trim(),
    systemPrompt: String(formData.get("systemPrompt") || "").trim(),
    adminThemeNote: String(formData.get("adminThemeNote") || "").trim()
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function reviewTranslationAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") || "");
  const reviewedText = String(formData.get("reviewedText") || "").trim();
  const status = String(formData.get("status") || "approved") as TranslationStatus;

  if (id && reviewedText) {
    await updateTranslationReview(id, reviewedText, status);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/translations/${id}`);
}

export async function deleteTranslationAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (id) {
    await deleteTranslation(id);
  }
  revalidatePath("/");
  revalidatePath("/admin");
}
