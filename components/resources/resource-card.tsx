import { ExternalLink, MapPin, Mail, Phone, Languages, ShieldCheck, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Resource } from "@/lib/data/resources";

export type ResourceCardLabels = {
  visitWebsite: string;
  verified: string;
  lastVerified: string;
  region: string;
  languages: string;
  featured: string;
};

/**
 * Renders one resource. Every optional field hides when empty — no placeholders,
 * no "N/A". Supports verification status, last-verified date, region, languages,
 * and a featured flag even though those columns may be empty today.
 */
export function ResourceCard({
  resource,
  categoryLabel,
  regionLabel,
  isVerified,
  isFeatured,
  locale,
  labels,
}: {
  resource: Resource;
  categoryLabel?: string;
  regionLabel?: string;
  isVerified?: boolean;
  isFeatured?: boolean;
  locale: string;
  labels: ResourceCardLabels;
}) {
  const intlLocale = locale === "zar" ? "en" : locale;
  const verifiedDate = resource.last_verified_date
    ? new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }).format(
        new Date(resource.last_verified_date),
      )
    : null;

  const hasLanguages =
    Array.isArray(resource.languages_supported) &&
    resource.languages_supported.length > 0;

  return (
    <Card className="flex h-full flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        {categoryLabel ? (
          <Badge className="border-brand-100 bg-brand-50 text-brand-800">
            {categoryLabel}
          </Badge>
        ) : null}
        {isFeatured ? (
          <Badge className="border-brand-100 bg-brand-50 text-brand-800">
            <Star className="mr-1 h-3 w-3" aria-hidden="true" />
            {labels.featured}
          </Badge>
        ) : null}
        {isVerified ? (
          <Badge>
            <ShieldCheck className="mr-1 h-3 w-3 text-brand-600" aria-hidden="true" />
            {labels.verified}
          </Badge>
        ) : null}
      </div>

      <h3 className="text-lg font-semibold text-ink">{resource.name}</h3>

      {resource.description ? (
        <p className="text-sm leading-relaxed text-ink-soft">
          {resource.description}
        </p>
      ) : null}

      <ul className="mt-1 flex flex-col gap-1.5 text-sm text-ink-soft">
        {regionLabel ? (
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{labels.region}:</span>
            {regionLabel}
          </li>
        ) : null}
        {hasLanguages && resource.languages_supported ? (
          <li className="flex items-center gap-2">
            <Languages className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{labels.languages}:</span>
            {resource.languages_supported.join(" · ")}
          </li>
        ) : null}
       {resource.contact_phone ? (
  <li className="flex items-center gap-2">
    <Phone className="h-4 w-4" aria-hidden="true" />

    <a
      href={`tel:${resource.contact_phone}`}
      className="hover:text-brand-700"
    >
      {resource.contact_phone}
    </a>
  </li>
) : null}
        {resource.contact_email ? (
          <li className="flex items-center gap-2">
            <Mail className="h-4 w-4" aria-hidden="true" />

<a
  href={`mailto:${resource.contact_email}`}
  className="hover:text-brand-700"
>
  {resource.contact_email}
</a>
          </li>
        ) : null}
        {verifiedDate ? (
          <li className="text-xs italic">
            {labels.lastVerified}: {verifiedDate}
          </li>
        ) : null}
      </ul>

      {resource.website_url ? (
        <div className="mt-auto pt-3">
          <Button asChild variant="secondary" size="sm">
  <a
    href={resource.website_url}
    target="_blank"
    rel="noopener noreferrer"
  >
    <ExternalLink className="h-4 w-4" aria-hidden="true" />
    {labels.visitWebsite}
  </a>
</Button>
        </div>
      ) : null}
    </Card>
  );
}