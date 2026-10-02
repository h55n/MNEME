// Demo mode serves fixture data instead of calling the API.
// It is on in non-production builds without an API URL, or anywhere when
// NEXT_PUBLIC_DEMO_MODE=true is set explicitly. Production never falls back
// to it silently, so an outage stays visible.
const noApiUrl = !process.env.NEXT_PUBLIC_API_URL;

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || (!IS_PRODUCTION && noApiUrl);
