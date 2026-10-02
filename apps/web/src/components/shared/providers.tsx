'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import '@getpara/react-sdk/styles.css';
import { Environment, ParaProvider } from '@getpara/react-sdk';
import { http } from 'wagmi';
import { monad, monadTestnet } from 'wagmi/chains';
import { DEMO_MODE } from '@/lib/demo';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  }));

  // The demo has no wallet login, and the Para SDK throws on load without an API key.
  if (DEMO_MODE && !process.env.NEXT_PUBLIC_PARA_API_KEY) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={{
          apiKey: process.env.NEXT_PUBLIC_PARA_API_KEY!,
          env: Environment.BETA,
        }}
        config={{ appName: 'MNEME' }}
        paraModalConfig={{
          oAuthMethods: ['GOOGLE', 'APPLE', 'DISCORD', 'TWITTER', 'FACEBOOK', 'FARCASTER'],
          disablePhoneLogin: false,
          recoverySecretStepEnabled: true,
        }}
        externalWalletConfig={{
          evmConnector: {
            config: {
              chains: [monadTestnet, monad],
              transports: {
                [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
                [monad.id]: http('https://rpc.monad.xyz'),
              },
            },
          },
          wallets: ['METAMASK', 'COINBASE', 'WALLETCONNECT', 'RAINBOW', 'ZERION', 'RABBY'],
        }}
      >
        {children}
      </ParaProvider>
    </QueryClientProvider>
  );
}
