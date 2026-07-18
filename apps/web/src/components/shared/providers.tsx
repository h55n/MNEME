'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import '@getpara/react-sdk/styles.css';
import { Environment, ParaProvider } from '@getpara/react-sdk';
import { http } from 'wagmi';
import { monad, monadTestnet } from 'wagmi/chains';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  }));

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
