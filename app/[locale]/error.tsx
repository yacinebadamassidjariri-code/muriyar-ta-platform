"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors");
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-ink-soft">{t("body")}</p>
      <Button className="mt-6" onClick={reset}>
        {t("retry")}
      </Button>
    </div>
  );
}
