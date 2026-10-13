"use client";

import React, { useState, useMemo } from "react";
import type { PublishedQa, QaTopic } from "@/lib/data/qa";
import styles from "@/components/ask/ask.module.css";

type Props = {
  items: PublishedQa[];
  topics: QaTopic[];
  copy: {
    searchPlaceholder: string;
    allTopics: string;
    noResults: string;
    noResultsForSearch: string;
    topicLabel: string;
    answeredBy: string;
  };
};

export function BrowseList({ items, topics, copy }: Props) {
  const [search, setSearch] = useState<string>("");
  const [topicFilter, setTopicFilter] = useState<string>("");

  const topicMap = useMemo(
    () => Object.fromEntries(topics.map((t) => [t.topic_id, t.label])),
    [topics],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (topicFilter && item.topic_id !== topicFilter) return false;
      if (!q) return true;
      return (
        item.question_display.toLowerCase().includes(q) ||
        item.answer_text.toLowerCase().includes(q)
      );
    });
  }, [items, search, topicFilter]);

  const hasFilter = search.trim() !== "" || topicFilter !== "";
  const isEmpty = filtered.length === 0;

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.filtersInner}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder={copy.searchPlaceholder}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            aria-label={copy.searchPlaceholder}
          />
          {topics.length > 0 && (
            <select
              className={styles.topicFilter}
              value={topicFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTopicFilter(e.target.value)}
              aria-label="Filter by topic"
            >
              <option value="">{copy.allTopics}</option>
              {topics.map((t) => (
                <option key={t.topic_id} value={t.topic_id}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <section className={styles.qaList}>
        {isEmpty ? (
          <div className={styles.emptyState}>
            <p>{hasFilter ? copy.noResultsForSearch : copy.noResults}</p>
          </div>
        ) : (
          <ul className={styles.qaListInner} aria-live="polite">
            {filtered.map((item: PublishedQa) => {
              const topicLabel = item.topic_id ? topicMap[item.topic_id] : null;
              return (
                <li key={item.published_qa_id} className={styles.qaCard}>
                  <article className={styles.qaCardInner}>
                    {topicLabel && (
                      <p className={styles.qaTopicBadge}>
                        {copy.topicLabel} {topicLabel}
                      </p>
                    )}
                    <blockquote className={styles.qaQuestion}>
                      {item.question_display}
                    </blockquote>
                    <div className={styles.qaAnswer}>
                      <span className={styles.qaAnswerLabel}>
                        {copy.answeredBy} {item.attribution_label}
                      </span>
                      <p className={styles.qaAnswerText}>{item.answer_text}</p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
