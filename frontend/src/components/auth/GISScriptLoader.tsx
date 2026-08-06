"use client";
import Script from "next/script";

export function GISScriptLoader() {
  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="lazyOnload"
    />
  );
}
