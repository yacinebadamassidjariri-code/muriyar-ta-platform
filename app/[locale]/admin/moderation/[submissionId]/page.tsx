import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { getProfile } from "@/lib/auth/session";
import { getModerationLookups, getModerationWorkspace } from "@/lib/data/admin/moderation";
import { getModerationAdminCopy } from "@/components/admin/moderation/content";
import { StoryReviewEditor } from "@/components/admin/moderation/story-review-editor";

export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const{locale}=await params;return{title:getModerationAdminCopy(locale).reviewTitle};}
export default async function StoryReviewPage({params}:{params:Promise<{locale:string;submissionId:string}>}){const{locale,submissionId}=await params;setRequestLocale(locale);await requirePermission("submission.raw.read");const copy=getModerationAdminCopy(locale);const [workspace,lookups,profile]=await Promise.all([getModerationWorkspace(submissionId),getModerationLookups(),getProfile()]);if(!workspace.ok){if(workspace.error==="not_found")notFound();return <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger">{copy.error}</p>;}if(!lookups.ok||!profile)return <p role="alert" className="text-danger">{copy.error}</p>;return <div className="space-y-6"><header><Link href="/admin/moderation/queue" className="text-sm font-semibold text-brand-700 hover:underline">← {copy.back}</Link><h1 className="mt-3 font-display text-4xl font-semibold text-ink">{copy.reviewTitle}</h1><p className="mt-2 font-mono text-sm text-ink-soft">{submissionId.slice(0,8)}</p></header><StoryReviewEditor workspace={workspace.value} lookups={lookups.value} copy={copy} currentUserId={profile.user_id} canAssign={profile.permissions.includes("submission.assign")} canEdit={profile.permissions.includes("story.edit")} canDisposition={profile.permissions.includes("submission.disposition")} canPublish={profile.permissions.includes("story.publish")} locale={locale}/></div>;
}
