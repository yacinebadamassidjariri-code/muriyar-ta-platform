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
      className="flex w-full max-w-3xl items-stretch border-b border-plum-300 pb-2"
    >
      <label htmlFor="resources-q" className="sr-only">
        {label}
      </label>
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-plum-500"
          aria-hidden="true"
        />
        <Input
          id="resources-q"
          name="q"
          type="search"
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          className="h-12 rounded-none border-0 bg-transparent pl-8 text-base shadow-none placeholder:text-charcoal-500 focus-visible:outline-offset-0"
        />
      </div>
      {activeCategoryId !== null ? (
        <input type="hidden" name="category" value={String(activeCategoryId)} />
      ) : null}
      <Button
        type="submit"
        className="h-12 shrink-0 rounded-sm bg-plum-800 px-5 text-cream-50 hover:bg-plum-900"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
