"use client";

import Script from "next/script";
import { useEffect } from "react";

type GtmProviderProps = {
  gtmId?: string | null;
  ga4Id?: string | null;
  children?: React.ReactNode;
};

export default function GtmProvider({ gtmId, ga4Id, children }: GtmProviderProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as typeof window & { dataLayer?: unknown[] };
    if (!Array.isArray(win.dataLayer)) {
      win.dataLayer = [];
    }
  }, []);

  if (!gtmId) {
    return <>{children}</>;
  }

  return (
    <>
      <Script id="gtm-base" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
      </Script>
      {ga4Id ? (
        <Script id="ga4-gtag" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];function gtag(){window.dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${ga4Id}', { send_page_view: false });`}
        </Script>
      ) : null}
      {children}
    </>
  );
}
