/**
 * Part: dots in rows, the array model of multiplication (docs/05: arrays as the model for
 * multiplication). Moved out of blocks/show/ShowBlock.tsx (dl-w3.47) so the Show block, a help
 * card's picture and a family's figure draw the same array. Scales to fit: dots are a fraction of
 * the box width, never below 1rem, never scrolling.
 */

export function DotArray({
  rows,
  cols,
  label,
  className,
}: {
  rows: number;
  cols: number;
  label: string;
  className?: string | undefined;
}): JSX.Element {
  return (
    <div
      role="img"
      aria-label={label}
      data-dots={`${rows}x${cols}`}
      className={className ?? "grid gap-2 max-w-full"}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(1rem, 2.5rem))` }}
    >
      {Array.from({ length: rows * cols }, (_, i) => (
        <span key={i} className="aspect-square rounded-full bg-primary min-w-4" />
      ))}
    </div>
  );
}
