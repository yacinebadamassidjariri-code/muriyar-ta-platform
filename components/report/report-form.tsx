"use client";

import { useId, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Category =
  | ""
  | "child_marriage"
  | "gbv"
  | "education"
  | "trafficking"
  | "harassment"
  | "mental_health"
  | "other";

type Labels = {
  categoryLabel: string;
  categoryPlaceholder: string;
  categoryOptions: Record<Exclude<Category, "">, string>;
  descriptionLabel: string;
  descriptionHelp: string;
  countryLabel: string;
  regionLabel: string;
  cityLabel: string;
  emailLabel: string;
  emailHelp: string;
  phoneLabel: string;
  phoneHelp: string;
  consentLabel: string;
  optionalHint: string;
  submitButton: string;
  submittingLabel: string;
  successTitle: string;
  successBody: string;
  successAction: string;
  errors: {
    categoryRequired: string;
    descriptionRequired: string;
    consentRequired: string;
    genericFailure: string;
  };
};

type FieldError = {
  category?: string;
  description?: string;
  consent?: string;
};

type FormState =
  | { phase: "editing" }
  | { phase: "submitting" }
  | { phase: "success" }
  | { phase: "error"; message: string };

const fieldClass =
  "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 " +
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft";

/**
 * Report submission form — MVP.
 *
 * This milestone is intentionally frontend-only. On submit the form validates
 * client-side and transitions to a success state. When the backend milestone
 * lands, the `onSubmit` handler will call a server action; the form
 * structure, labels, and error mapping stay put.
 */
export function ReportForm({ labels }: { labels: Labels }) {
  const [state, setState] = useState<FormState>({ phase: "editing" });
  const [errors, setErrors] = useState<FieldError>({});

  const [category, setCategory] = useState<Category>("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);

  const uid = useId();
  const catId = `${uid}-cat`;
  const descId = `${uid}-desc`;
  const descHelpId = `${uid}-desc-help`;
  const countryId = `${uid}-country`;
  const regionId = `${uid}-region`;
  const cityId = `${uid}-city`;
  const emailId = `${uid}-email`;
  const emailHelpId = `${uid}-email-help`;
  const phoneId = `${uid}-phone`;
  const phoneHelpId = `${uid}-phone-help`;
  const consentId = `${uid}-consent`;

  function validate(): FieldError {
    const next: FieldError = {};
    if (!category) next.category = labels.errors.categoryRequired;
    if (!description.trim())
      next.description = labels.errors.descriptionRequired;
    if (!consent) next.consent = labels.errors.consentRequired;
    return next;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setState({ phase: "success" });
return;
  }

  function handleReset() {
    setCategory("");
    setDescription("");
    setCountry("");
    setRegion("");
    setCity("");
    setEmail("");
    setPhone("");
    setConsent(false);
    setErrors({});
    setState({ phase: "editing" });
  }

  if (state.phase === "success") {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
          >
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-ink">
              {labels.successTitle}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {labels.successBody}
            </p>
            <div className="mt-4">
              <Button type="button" variant="secondary" onClick={handleReset}>
                {labels.successAction}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const busy = state.phase === "submitting";
  const banner = state.phase === "error" ? state.message : null;

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {banner ? (
          <p
            role="alert"
            aria-live="assertive"
            className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {banner}
          </p>
        ) : null}

        {/* Category */}
        <div>
          <Label htmlFor={catId}>{labels.categoryLabel}</Label>
          <select
            id={catId}
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            required
            aria-invalid={!!errors.category}
            aria-describedby={
              errors.category ? `${catId}-err` : undefined
            }
            className={"mt-1.5 " + fieldClass}
          >
            <option value="">{labels.categoryPlaceholder}</option>
            <option value="child_marriage">
              {labels.categoryOptions.child_marriage}
            </option>
            <option value="gbv">{labels.categoryOptions.gbv}</option>
            <option value="education">
              {labels.categoryOptions.education}
            </option>
            <option value="trafficking">
              {labels.categoryOptions.trafficking}
            </option>
            <option value="harassment">
              {labels.categoryOptions.harassment}
            </option>
            <option value="mental_health">
              {labels.categoryOptions.mental_health}
            </option>
            <option value="other">{labels.categoryOptions.other}</option>
          </select>
          {errors.category ? (
            <p
              id={`${catId}-err`}
              role="status"
              aria-live="polite"
              className="mt-1 text-sm text-danger"
            >
              {errors.category}
            </p>
          ) : null}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor={descId}>{labels.descriptionLabel}</Label>
          <Textarea
            id={descId}
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            maxLength={8000}
            required
            aria-invalid={!!errors.description}
            aria-describedby={
              [descHelpId, errors.description ? `${descId}-err` : ""]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className="mt-1.5"
          />
          <p id={descHelpId} className="mt-1 text-xs text-ink-soft">
            {labels.descriptionHelp}
          </p>
          {errors.description ? (
            <p
              id={`${descId}-err`}
              role="status"
              aria-live="polite"
              className="mt-1 text-sm text-danger"
            >
              {errors.description}
            </p>
          ) : null}
        </div>

        {/* Country / Region / City */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor={countryId}>{labels.countryLabel}</Label>
            <Input
              id={countryId}
              name="country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              maxLength={80}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor={regionId}>{labels.regionLabel}</Label>
            <Input
              id={regionId}
              name="region"
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              maxLength={80}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor={cityId}>{labels.cityLabel}</Label>
            <Input
              id={cityId}
              name="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={80}
              className="mt-1.5"
            />
          </div>
        </div>

        {/* Email + Phone */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={emailId}>
              {labels.emailLabel}{" "}
              <span className="font-normal text-ink-soft">
                {labels.optionalHint}
              </span>
            </Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              aria-describedby={emailHelpId}
              className="mt-1.5"
              autoComplete="email"
            />
            <p id={emailHelpId} className="mt-1 text-xs text-ink-soft">
              {labels.emailHelp}
            </p>
          </div>
          <div>
            <Label htmlFor={phoneId}>
              {labels.phoneLabel}{" "}
              <span className="font-normal text-ink-soft">
                {labels.optionalHint}
              </span>
            </Label>
            <Input
              id={phoneId}
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={32}
              aria-describedby={phoneHelpId}
              className="mt-1.5"
              autoComplete="tel"
            />
            <p id={phoneHelpId} className="mt-1 text-xs text-ink-soft">
              {labels.phoneHelp}
            </p>
          </div>
        </div>

        {/* Consent */}
        <div>
          <label
            htmlFor={consentId}
            className="flex items-start gap-3 text-sm leading-relaxed text-ink"
          >
            <input
              id={consentId}
              name="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              aria-invalid={!!errors.consent}
              aria-describedby={
                errors.consent ? `${consentId}-err` : undefined
              }
              className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            />
            <span>{labels.consentLabel}</span>
          </label>
          {errors.consent ? (
            <p
              id={`${consentId}-err`}
              role="status"
              aria-live="polite"
              className="mt-1 text-sm text-danger"
            >
              {errors.consent}
            </p>
          ) : null}
        </div>

        <div className="border-t border-line pt-4">
          <Button type="submit" disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            {busy ? labels.submittingLabel : labels.submitButton}
          </Button>
        </div>
      </form>
    </Card>
  );
}