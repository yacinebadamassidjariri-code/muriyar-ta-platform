import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Non-JS, SSR-friendly search. Submits a GET to the same route, preserving the
 * active category via a hidden field. Works without client JavaScript.
 */
export function SearchBar({
  label,
  placeholder,
  submitLabel,
  defaultValue,
  activeCategoryId = null,
  action,
}: {
  label: string;
  placeholder: string;
  submitLabel: string;
  defaultValue?: string;
  activeCategoryId?: number | null;
  action: string; // e.g. "/en/resources"
}) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      className="flex w-full max-w-2xl items-center gap-2"
    >
      <label htmlFor="resources-q" className="sr-only">
        {label}
      </label>
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
          aria-hidden="true"
        />
        <Input
          id="resources-q"
          name="q"
          type="search"
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {activeCategoryId !== null ? (
        <input type="hidden" name="category" value={String(activeCategoryId)} />
      ) : null}
      <Button type="submit" variant="secondary">
        {submitLabel}
      </Button>
    </form>
  );
}
