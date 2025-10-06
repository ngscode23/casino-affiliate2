import localFont from "next/font/local";

export const openAISans = localFont({
  src: [
    { path: "../public/fonts/openai-sans/OpenAISans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/openai-sans/OpenAISans-RegularItalic.woff2", weight: "400", style: "italic" },
    { path: "../public/fonts/openai-sans/OpenAISans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/openai-sans/OpenAISans-MediumItalic.woff2", weight: "500", style: "italic" },
    { path: "../public/fonts/openai-sans/OpenAISans-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/openai-sans/OpenAISans-SemiboldItalic.woff2", weight: "600", style: "italic" },
    { path: "../public/fonts/openai-sans/OpenAISans-Bold.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/openai-sans/OpenAISans-BoldItalic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-sans",
  display: "swap",
});
