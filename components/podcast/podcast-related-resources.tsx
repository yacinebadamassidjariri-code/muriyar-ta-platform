import { ExternalLink, HeartHandshake, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import type { RelatedResource } from "@/lib/data/podcast";

type Labels = {
  eyebrow: string;
  heading: string;
  description: string;
  visit: string;
};

/**
 * Small Resources rail derived from the episode's themes (soft match on
 * category name). Renders nothing when there are no matches — never fabricates.
 */
export function PodcastRelatedResources({
  resources,
  labels,
}: {
  resources: RelatedResource[];
  labels: Labels;
}) {
  if (resources.length === 0) return null;

  return (
    <Section
      id="podcast-related-resources"
      eyebrow={labels.eyebrow}
      title={labels.heading}
      description={labels.description}
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resources.map((r) => (
          <li key={r.resource_id}>
            <Card className="flex h-full flex-col gap-2 p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <HeartHandshake className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="font-semibold text-ink">{r.name}</p>
              {r.description ? (
                <p className="line-clamp-3 text-sm text-ink-soft">
                  {r.description}
                </p>
              ) : null}
              {r.contact_phone ? (
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-soft">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  <a
                    href={`tel:${r.contact_phone}`}
                    className="hover:text-brand-700"
                  >
                    {r.contact_phone}
                  </a>
                </p>
              ) : null}
              {r.website_url ? (
                <div className="mt-auto pt-2">
                  <Button asChild variant="secondary" size="sm">
                    <a
                      href={r.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      {labels.visit}
                    </a>
                  </Button>
                </div>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}