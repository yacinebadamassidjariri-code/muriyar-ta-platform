import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StoriesEmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <BookOpen className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="max-w-md text-ink-soft">{body}</p>
    </Card>
  );
}