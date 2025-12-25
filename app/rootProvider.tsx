"use client";
import { ReactNode, useState } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { baseSepolia, mainnet, base } from 'viem/chains';
import { WagmiProvider, createConfig, http } from 'wagmi';
import '@coinbase/onchainkit/styles.css';

const wagmiConfig = createConfig({
  chains: [baseSepolia, mainnet, base],
  transports: {
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
    [base.id]: http(),
  },
});

export function RootProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={baseSepolia}
          config={{
            appearance: {
              mode: 'auto',
            },
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
