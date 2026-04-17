interface AvatarBlockProps {
  url?: string | null;
  name: string;
  size?: number;
}

export const AvatarBlock = ({ url, name, size = 36 }: AvatarBlockProps) => {
  const initial = (name?.[0] ?? "?").toUpperCase();
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-elevated text-foreground/80 font-medium overflow-hidden hairline"
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};
