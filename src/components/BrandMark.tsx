interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span className={className} aria-hidden="true">
      ◎
    </span>
  );
}
