"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { locales } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction(formData: FormData): Promise<void> {
  const localeValue = formData.get("locale");
  const locale =
    typeof localeValue === "string" &&
    (locales as readonly string[]).includes(localeValue)
      ? localeValue
      : "en";

  const user = await getUser();
  if (user) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(`/${locale}/login`);
}
