import { NextRequest, NextResponse } from 'next/server';

import { AUTH_HEADER_NAME } from '@shared/api-contract';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
];

function getAllowedOrigins(): string[] {
  const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins?.length
    ? configuredOrigins
    : DEFAULT_ALLOWED_ORIGINS;
}

function getAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');

  if (!origin) {
    return null;
  }

  return getAllowedOrigins().includes(origin) ? origin : null;
}

function appendVaryHeader(response: NextResponse, value: string) {
  const currentVary = response.headers.get('Vary');

  if (!currentVary) {
    response.headers.set('Vary', value);
    return;
  }

  const varyValues = currentVary
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!varyValues.includes(value)) {
    varyValues.push(value);
    response.headers.set('Vary', varyValues.join(', '));
  }
}

export function applyApiCorsHeaders(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return response;
  }

  const allowedOrigin = getAllowedOrigin(request);
  if (!allowedOrigin) {
    return response;
  }

  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    `Content-Type, Authorization, ${AUTH_HEADER_NAME}`
  );
  response.headers.set('Access-Control-Max-Age', '86400');
  appendVaryHeader(response, 'Origin');

  return response;
}

export function createApiPreflightResponse(request: NextRequest): NextResponse {
  return applyApiCorsHeaders(request, new NextResponse(null, { status: 204 }));
}
