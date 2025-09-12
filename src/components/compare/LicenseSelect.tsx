import { track } from "@/lib/analytics";
import cn from "@/lib/cn";
import { useT } from "@/lib/useT";

export type LicenseFilter = "all" | "MGA" | "UKGC" | "Curacao";

type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
>;

type Props = {
  value: LicenseFilter;
  onChange: (v: LicenseFilter) => void;
} & SelectProps;

export default function LicenseSelect({ value, onChange, className, ...rest }: Props & { className?: string }) {
  const t = useT();
  return (
    <select
      aria-label={t("offer.license")}
      className={cn("min-w-[160px] rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40", className)}
      value={value}
      onChange={(e) => {
        const val = e.target.value as LicenseFilter;
        onChange(val);
        track({ name: "toggle_filter", params: { filter: "license", value: val } });
      }}
      {...rest}
    >
      <option value="all">{t("filters.all") || "All"}</option>
      <option value="MGA">MGA</option>
      <option value="UKGC">UKGC</option>
      <option value="Curacao">Curaçao</option>
    </select>
  );
}
