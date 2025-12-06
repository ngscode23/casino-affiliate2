import Link from "next/link";
import { cn } from "@shared/lib/cn";
import styles from "./SiteHeader.module.css";

export type HoverPanelItem = {
  label: string;
  href: string;
  description?: string;
};

export type HoverPanel = {
  title: string;
  subtitle: string;
  items: HoverPanelItem[];
};

type Props = {
  panel: HoverPanel;
  open: boolean;
};

export function CatalogPanel({ panel, open }: Props) {
  return (
    <div className={cn(styles.vhNavPanel, open && styles.vhNavPanelVisible)} aria-hidden={!open}>
      <div className={styles.vhNavPanelHeader}>
        <span className={styles.vhNavPanelTitle}>{panel.title}</span>
        <span className={styles.vhNavPanelSubtitle}>{panel.subtitle}</span>
      </div>
      <ul className={styles.vhNavPanelList}>
        {panel.items.map((panelItem) => (
          <li key={`${panelItem.href}-${panelItem.label}`}>
            <Link href={panelItem.href} className={styles.vhNavPanelLink}>
              <span>{panelItem.label}</span>
              {panelItem.description ? <span className={styles.vhNavPanelMeta}>{panelItem.description}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CatalogPanel;
