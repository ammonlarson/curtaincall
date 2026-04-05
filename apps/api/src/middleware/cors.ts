const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
];

/**
 * Get the allowed origin for a request, or null if not allowed.
 */
function isAmplifyOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.hostname.endsWith('.amplifyapp.com');
  } catch {
    return false;
  }
}

function getAllowedOrigin(requestOrigin: string | undefined): string | null {
  if (!requestOrigin) return null;

  // In production, check against configured origin
  const configuredOrigin = process.env['CORS_ORIGIN'];
  if (configuredOrigin && requestOrigin === configuredOrigin) {
    return configuredOrigin;
  }

  // Allow Amplify preview/staging domains
  if (isAmplifyOrigin(requestOrigin)) {
    return requestOrigin;
  }

  // In development, allow localhost origins
  if (ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }

  return null;
}

/**
 * Build CORS headers for a response.
 */
export function getCorsHeaders(requestOrigin: string | undefined): Record<string, string> {
  const origin = getAllowedOrigin(requestOrigin);

  if (!origin) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Create a preflight response for CORS OPTIONS requests.
 */
export function handlePreflight(requestOrigin: string | undefined): Response {
  const headers = getCorsHeaders(requestOrigin);

  return new Response(null, {
    status: 204,
    headers,
  });
}
