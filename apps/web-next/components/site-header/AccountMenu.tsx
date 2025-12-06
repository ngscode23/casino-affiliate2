"use client";

import Link from "next/link";
import { User } from "lucide-react";

import { cn } from "@shared/lib/cn";
import styles from "./SiteHeader.module.css";

type AccountMenuProps = {
  href: string;
  label: string;
  isActive?: boolean;
};

/**
 * Лёгкий динамический аккаунт-экшен.
 * Можно позже расширить до полноценного дропдауна, пока оставляем быстрый клик.
 */
export default function AccountMenu({ href, label, isActive }: AccountMenuProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={cn(styles.vhActionButton, isActive && styles.vhNavLinkActive)}
    >
      <User size={18} aria-hidden />
    </Link>
  );
}
