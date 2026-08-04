import { BotanicalCorner } from "@/components/home/botanical";
import { cn } from "@/lib/utils/cn";

const placeholderPalettes = [
  "from-[#DDD0D1] via-[#C4B0B7] to-[#806879]",
  "from-[#E7D8D0] via-[#CFB8B4] to-[#977783]",
  "from-[#D9D2CA] via-[#B8AAA7] to-[#746473]",
  "from-[#E8D7D6] via-[#C5A9B2] to-[#836978]",
] as const;

/** Stable editorial artwork slot, ready to be replaced by a same-size image. */
export function StoryImagePlaceholder({
  variant,
  index,
  className,
}: {
  variant: "featured" | "thumbnail";
  index: number;
  className?: string;
}) {
  const palette = placeholderPalettes[index % placeholderPalettes.length];

  return (
    <div
      aria-hidden="true"
      data-story-image-placeholder={variant}
      className={cn(
        "relative overflow-hidden bg-gradient-to-br",
        palette,
        variant === "featured"
          ? "aspect-[16/9] w-full"
          : "aspect-[4/3] w-full rounded-xl",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(255,250,244,0.72),transparent_34%),linear-gradient(135deg,rgba(45,32,56,0.1),transparent_55%)]" />
      <div className="absolute inset-x-[12%] bottom-[18%] h-px bg-cream-50/45" />
      <BotanicalCorner
        className={cn(
          "absolute text-cream-50/55",
          variant === "featured"
            ? "-bottom-8 right-[8%] h-36 w-36 sm:h-48 sm:w-48"
            : "-bottom-5 -right-3 h-20 w-20",
        )}
      />
    </div>
  );
}
