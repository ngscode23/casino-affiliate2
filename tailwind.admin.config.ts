import plugin from "tailwindcss/plugin";

import baseConfig, { themeAdminTokens } from "./tailwind.config";

const adminContent = [
  "./apps/web-next/app/admin/**/*.{ts,tsx}",
  "./apps/web-next/components/admin/**/*.{ts,tsx}",
  "./apps/web-next/app/admin/**/*.{js,jsx}",
  "./apps/web-next/components/admin/**/*.{js,jsx}",
  "./apps/web-next/lib/**/*.{ts,tsx}",
  "./apps/web-next/utils/**/*.{ts,tsx}",
  "./packages/ui/src/**/*.{js,jsx,ts,tsx}",
  "./packages/shared/src/**/*.{js,jsx,ts,tsx}",
];

export default {
  ...baseConfig,
  content: adminContent,
  plugins: [
    ...(baseConfig.plugins ?? []),
    plugin(({ addBase }) => {
      addBase({ ".theme-admin": themeAdminTokens });
    }),
  ],
};
