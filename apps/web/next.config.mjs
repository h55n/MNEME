/** @type {import('next').NextConfig} */
// Security headers on every route. The CSP is limited to directives that cannot break the
// wallet and font scripts the app loads: no framing, no plugins, no foreign base tag or form target.
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  typedRoutes: false,

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '',
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
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
