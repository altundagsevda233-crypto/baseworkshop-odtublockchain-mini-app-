import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { SafeArea } from "@coinbase/onchainkit/minikit";
import { minikitConfig } from "../minikit.config";
import { RootProvider } from "./rootProvider";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const ROOT_URL =
    process.env.NEXT_PUBLIC_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://baseworkshop-odtublockchain-mini-ap.vercel.app");

  return {
    title: "SpellCard NFT Creator",
    description: "Create and mint mystical spell card NFTs",
    openGraph: {
      title: "SpellCard NFT Creator",
      description: "Create and mint mystical spell card NFTs",
      images: [`${ROOT_URL}/hero.png`],
    },
    other: {
      "fc:frame": "vNext",
      "fc:frame:image": `${ROOT_URL}/hero.png`,
      "fc:frame:post_url": `${ROOT_URL}/api/frame`,
      "fc:frame:button:1": "Start Creating",
      "fc:frame:button:1:action": "post",
    },
  };
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RootProvider>
      <html lang="en">
        <body className={`${inter.variable} ${sourceCodePro.variable}`}>
          <SafeArea>{children}</SafeArea>
        </body>
      </html>
    </RootProvider>
  );
}
