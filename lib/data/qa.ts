import "server-only";
import { createClient } from "@/lib/supabase/server";

export type QaTopic = {
  topic_id: string;
  slug: string;
  sort_order: number;
  label: string; // translated for current locale
};

export type PublishedQa = {
  published_qa_id: string;
  topic_id: string | null;
  language_code: string;
  slug: string;
  question_display: string;
  answer_text: string;
  attribution_label: string;
  published_at: string;
  updated_at: string;
};

/**
 * Load active Q&A topics with translations for the given locale.
 * Falls back to English label if the locale-specific translation is missing.
 * Returns [] on any error so the form degrades gracefully.
 */
export async function listQaTopics(locale: string): Promise<QaTopic[]> {
  try {
    const supabase = await createClient();

    // Fetch topics and all translations in one pass, then merge in JS.
    const [topicsRes, translationsRes] = await Promise.all([
      supabase
        .from("qa_topics")
        .select("topic_id, slug, sort_order")
        .eq("active", true)
        .order("sort_order"),
      supabase
        .from("qa_topic_translations")
        .select("topic_id, language_code, label"),
    ]);

    if (topicsRes.error || !topicsRes.data) return [];

    const translations = translationsRes.data ?? [];

    type TopicRow = { topic_id: string; slug: string; sort_order: number };
    type TransRow = { topic_id: string; language_code: string; label: string };

    return (topicsRes.data as TopicRow[]).map((t) => {
      const match =
        (translations as TransRow[]).find(
          (tr) => tr.topic_id === t.topic_id && tr.language_code === locale,
        ) ??
        (translations as TransRow[]).find(
          (tr) => tr.topic_id === t.topic_id && tr.language_code === "en",
        );
      return {
        topic_id: t.topic_id,
        slug: t.slug,
        sort_order: t.sort_order,
        label: match?.label ?? t.slug,
      };
    });
  } catch {
    return [];
  }
}

/**
 * List published Q&A entries for the browse page.
 * Publicly readable (RLS: select to anon using (true)).
 * Returns [] on any error.
 */
export async function listPublishedQa(options?: {
  topicId?: string;
  limit?: number;
  offset?: number;
}): Promise<PublishedQa[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("published_qa")
      .select(
        "published_qa_id, topic_id, language_code, slug, question_display, answer_text, attribution_label, published_at, updated_at",
      )
      .order("published_at", { ascending: false });

    if (options?.topicId) {
      query = query.eq("topic_id", options.topicId);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit ?? 20) - 1,
      );
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data as PublishedQa[];
  } catch {
    return [];
  }
}
