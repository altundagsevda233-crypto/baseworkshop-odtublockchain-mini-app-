"use client";
import { ReactNode } from "react";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";

// Manually define Base Sepolia to ensure NO non-serializable objects (like Sets) are present
const baseSepoliaVal = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
};

export function RootProvider({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY) {
    console.warn("NEXT_PUBLIC_ONCHAINKIT_API_KEY is missing!");
  }

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={baseSepoliaVal} // Pass plain object
      config={{
        appearance: {
          mode: "auto",
        },
        wallet: {
          display: "modal",
          preference: "all",
        },
      }}
      miniKit={{
        enabled: true,
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
