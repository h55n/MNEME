/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    typedRoutes: false,
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1',
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@x402/evm/upto/client': false,
      '@x402/evm/exact/client': false,
      '@x402/core/client': false,
      '@x402/svm/exact/client': false,
      '@x402/evm': false,
      '@getpara/ethers-v6-integration': false,
      '@getpara/solana-wallet-connectors': false,
      '@farcaster/miniapp-sdk': false,
      '@farcaster/miniapp-wagmi-connector': false,
      '@metamask/connect-evm': false,
      'porto': false,
      'accounts': false,
      'porto/internal': false,
    };

    // The @getpara CSS files use Tailwind v4 syntax which is incompatible
    // with the project's Tailwind v3 PostCSS config. We bypass PostCSS
    // for those files by injecting them as raw CSS via style-loader / null-loader.
    // Simplest fix: treat all @getpara CSS as empty modules at build time.
    config.module.rules.push({
      test: /node_modules[\\/]@getpara[\\/].*\.css$/,
      use: 'null-loader',
    });

    return config;
  },
};

export default nextConfig;
