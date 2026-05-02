interface SectionHeaderProps {
  tag?: string;
  title: string;
  className?: string;
}

export default function SectionHeader({ tag, title, className = "" }: SectionHeaderProps) {
  return (
    <div className={className}>
      {tag && (
        <span className="inline-block font-body text-secondary text-sm font-medium uppercase tracking-wider mb-2">
          {tag}
        </span>
      )}
      <h2 className="font-headline text-3xl font-bold text-text-main tracking-tight">{title}</h2>
    </div>
  );
}
