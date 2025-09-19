type Props = {
  href: string;        // целевая ссылка
  label?: string;
  campaign?: string;   // опциональный slug кампании
  className?: string;
};
export default function GoButton({ href, label = "Играть", campaign, className }: Props) {
  const url = new URL(href);
  url.searchParams.set("utm_source", "affiliate");
  if (campaign) url.searchParams.set("utm_campaign", campaign);

  return (
    <a
      href={url.toString()}
      target="_blank"
      rel="nofollow noopener sponsored"
      className={className ?? "px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"}
      data-testid="go-btn"
    >
      {label}
    </a>
  );
}

