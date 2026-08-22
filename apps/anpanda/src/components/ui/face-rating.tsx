"use client";

/**
 * 5段階フェイス評価。
 * SM-2 の quality (0-5) にマップする: しかめ顔=0 → 大きな笑顔=5。
 * quality < 3 は「不正解」扱い（sm2.ts の仕様）。
 */

export const FACE_RATINGS = [
  { key: "face1", quality: 0, label: "全然" },
  { key: "face2", quality: 2, label: "忘れた" },
  { key: "face3", quality: 3, label: "ぎりぎり" },
  { key: "face4", quality: 4, label: "できた" },
  { key: "face5", quality: 5, label: "余裕" },
] as const;

export type FaceKey = (typeof FACE_RATINGS)[number]["key"];
export type FaceRatingEntry = (typeof FACE_RATINGS)[number];

// 口の形（悲しい → 大きな笑顔）。viewBox 24 基準
const MOUTHS = [
  "M8.4 16.2 Q12 13.2 15.6 16.2",
  "M8.4 15.7 Q12 13.9 15.6 15.7",
  "M8.7 15.1 L15.3 15.1",
  "M8.4 14.4 Q12 16.6 15.6 14.4",
  "M8 13.9 Q12 17.6 16 13.9",
] as const;

export function FaceIcon({
  index,
  size = 34,
  className = "",
}: {
  index: number;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9.2" />
      <path d="M9 9.6 L9 10.1" />
      <path d="M15 9.6 L15 10.1" />
      <path d={MOUTHS[index] ?? MOUTHS[2]} />
    </svg>
  );
}

interface FaceRatingProps {
  onRate: (rating: (typeof FACE_RATINGS)[number]) => void;
  disabled?: boolean;
}

export function FaceRating({ onRate, disabled = false }: FaceRatingProps) {
  return (
    <div className="flex items-center justify-center gap-3" role="group" aria-label="覚えていましたか？">
      {FACE_RATINGS.map((r, i) => (
        <button
          key={r.key}
          type="button"
          disabled={disabled}
          onClick={() => onRate(r)}
          aria-label={r.label}
          className="flex h-12 w-12 items-center justify-center rounded-full text-text-muted/55 transition-all cursor-pointer hover:text-text-secondary active:scale-90 active:text-primary disabled:opacity-40"
        >
          <FaceIcon index={i} />
        </button>
      ))}
    </div>
  );
}
