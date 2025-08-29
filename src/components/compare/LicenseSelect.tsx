import { track } from "@/lib/analytics";

export type LicenseFilter = "all" | "MGA" | "UKGC" | "Curaçao";

// ВАЖНО: убираем value/onChange из DOM-пропов, чтобы не конфликтовали
type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
>;

type Props = {
  value: LicenseFilter;
  onChange: (v: LicenseFilter) => void;
} & SelectProps;

export default function LicenseSelect({ value, onChange, ...rest }: Props) {
  return (
    <select
      aria-label="License"
      value={value}
      onChange={(e) => {
        const val = e.target.value as LicenseFilter;
        onChange(val);
        track({ name: "toggle_filter", params: { filter: "license", value: val } });
      }}
      {...rest}
    >
      <option value="all">All</option>
      <option value="MGA">MGA</option>
      <option value="UKGC">UKGC</option>
      <option value="Curaçao">Curaçao</option>
    </select>
  );
}


