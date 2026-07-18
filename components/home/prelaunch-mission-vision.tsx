"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils/cn";
import styles from "./prelaunch-motion.module.css";

type MissionVisionCard = {
  title: string;
  body: string;
};

export function PrelaunchMissionVision({
  cards,
}: {
  cards: [MissionVisionCard, MissionVisionCard];
}) {
  const contentId = useId();
  const [flippedCards, setFlippedCards] = useState<boolean[]>(() =>
    cards.map(() => false),
  );

  const toggleCard = (index: number) => {
    setFlippedCards((current) =>
      current.map((isFlipped, cardIndex) =>
        cardIndex === index ? !isFlipped : isFlipped,
      ),
    );
  };

  return (
    <ul data-motion-stagger className="grid gap-6 md:grid-cols-2 md:gap-8">
      {cards.map((card, index) => {
        const isFlipped = flippedCards[index];
        const panelId = `${contentId}-${index}`;

        return (
          <li key={card.title} className="h-full">
            <button
              type="button"
              aria-label={card.title}
              aria-expanded={isFlipped}
              aria-controls={panelId}
              aria-describedby={isFlipped ? panelId : undefined}
              onClick={() => toggleCard(index)}
              className={cn(
                "block h-full w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600",
                styles.flipCard,
                isFlipped && styles.flipCardActive,
              )}
            >
              <span className={styles.flipCardInner} aria-hidden="true">
                <span
                  className={cn(styles.flipCardFace, styles.flipCardFront)}
                >
                  <span className={styles.flipCardOrnament} />
                  <span className="font-display text-4xl font-medium text-plum-800 md:text-5xl">
                    {card.title}
                  </span>
                  <span className={styles.flipCardOrnament} />
                </span>
                <span
                  className={cn(styles.flipCardFace, styles.flipCardBack)}
                >
                  <span className="font-display text-2xl font-medium text-cream-50 md:text-3xl">
                    {card.title}
                  </span>
                  <span className="mt-5 block text-base leading-relaxed text-stone-100 md:text-lg">
                    {card.body}
                  </span>
                </span>
              </span>
            </button>
            <p id={panelId} hidden={!isFlipped} className="sr-only">
              {card.body}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
