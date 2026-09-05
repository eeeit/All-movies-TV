import type {
  ImageProxyApiErrorResponse,
  ImageProxyApiQuery,
} from '@shared/api-contract';
import { NextResponse } from 'next/server';
import http from 'node:http';
import https from 'node:https';

const IMAGE_PROXY_REFERER = 'https://movie.douban.com/';
const IMAGE_PROXY_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const MAX_REDIRECTS = 3;

const FALLBACK_IMAGE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="480" height="720" viewBox="0 0 480 720" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Image placeholder">
  <defs>
    <linearGradient id="bg" x1="64" y1="80" x2="416" y2="640" gradientUnits="userSpaceOnUse">
      <stop stop-color="#101010" />
      <stop offset="1" stop-color="#1d1d1d" />
    </linearGradient>
  </defs>
  <rect width="480" height="720" fill="url(#bg)" />
  <rect x="64" y="80" width="352" height="560" rx="28" stroke="white" stroke-opacity="0.12" stroke-width="8" stroke-dasharray="20 18" />
  <circle cx="182" cy="262" r="36" fill="white" fill-opacity="0.14" />
  <path d="M122 532L206 428L274 510L328 448L356 484" stroke="white" stroke-opacity="0.16" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

function getHeaderValue(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function shouldAllowInsecureTls(hostname: string): boolean {
  return (
    hostname === 'healthcareqh.com' || hostname.endsWith('.healthcareqh.com')
  );
}

function parseRemoteImageUrl(imageUrl: string): URL {
  try {
    return new URL(imageUrl);
  } catch {
    if (imageUrl.startsWith('//')) {
      return new URL(`https:${imageUrl}`);
    }

    throw new Error('Invalid image URL');
  }
}

function normalizeHostname(hostname: string): string {
  const host = hostname.toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) {
    return host.slice(1, -1);
  }
  return host;
}

function isPrivateIpv4(host: string): boolean {
  const octets = host.split('.');
  if (octets.length !== 4) {
    return false;
  }

  const nums = octets.map((part) => Number(part));
  if (
    nums.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  ) {
    return false;
  }

  const [a, b] = nums;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + 云元数据
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIpv6(host: string): boolean {
  if (host === '::1' || host === '::') return true;

  const mappedV4 = host.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mappedV4) return isPrivateIpv4(mappedV4[1]);

  return /^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host);
}

function isBlockedImageHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.includes(':')) return isPrivateIpv6(host);
  // 整数/十六进制形式的 IP 可绕过点分校验，一律拒绝
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/.test(host)) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return isPrivateIpv4(host);
  return false;
}

function assertSafeRemoteImageUrl(url: URL): void {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Unsupported image URL protocol');
  }

  if (isBlockedImageHost(url.hostname)) {
    throw new Error('Blocked private image host');
  }
}

function applyImageCacheHeaders(headers: Headers): void {
  headers.set('Cache-Control', 'public, max-age=15720000, s-maxage=15720000');
  headers.set('CDN-Cache-Control', 'public, s-maxage=15720000');
  headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=15720000');
}

function buildFallbackImageResponse(): Response {
  const headers = new Headers();
  headers.set('Content-Type', 'image/svg+xml; charset=utf-8');
  applyImageCacheHeaders(headers);

  return new Response(FALLBACK_IMAGE_SVG, {
    status: 200,
    headers,
  });
}

function fetchRemoteImage(
  imageUrl: string,
  redirectCount = 0
): Promise<{ contentType?: string; body: Buffer }> {
  const parsedUrl = parseRemoteImageUrl(imageUrl);
  assertSafeRemoteImageUrl(parsedUrl);
  const allowInsecureTls = shouldAllowInsecureTls(
    parsedUrl.hostname.toLowerCase()
  );
  const requestHeaders = {
    Referer: IMAGE_PROXY_REFERER,
    'User-Agent': IMAGE_PROXY_USER_AGENT,
  };

  return new Promise((resolve, reject) => {
    const handleResponse = (response: http.IncomingMessage) => {
      const statusCode = response.statusCode ?? 500;
      const redirectLocation = getHeaderValue(response.headers.location);

      if (statusCode >= 300 && statusCode < 400 && redirectLocation) {
        response.resume();

        if (redirectCount >= MAX_REDIRECTS) {
          reject(new Error('Too many image redirects'));
          return;
        }

        resolve(
          fetchRemoteImage(
            new URL(redirectLocation, parsedUrl).toString(),
            redirectCount + 1
          )
        );
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`Upstream image request failed with ${statusCode}`));
        return;
      }

      const contentType = getHeaderValue(response.headers['content-type']);
      const chunks: Buffer[] = [];

      response.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      response.on('end', () => {
        resolve({
          contentType,
          body: Buffer.concat(chunks),
        });
      });

      response.on('error', reject);
    };

    const requestOptions = {
      headers: requestHeaders,
      ...(allowInsecureTls ? { rejectUnauthorized: false } : {}),
    };

    const request =
      parsedUrl.protocol === 'https:'
        ? https.request(parsedUrl, requestOptions, handleResponse)
        : http.request(parsedUrl, requestOptions, handleResponse);

    request.on('error', reject);
    request.end();
  });
}

// OrionTV 兼容接口
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url') as ImageProxyApiQuery['url'] | null;

  if (!imageUrl) {
    const errorResponse: ImageProxyApiErrorResponse = {
      error: 'Missing image URL',
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  try {
    const remoteImage = await fetchRemoteImage(imageUrl);

    if (!remoteImage.body.length) {
      return buildFallbackImageResponse();
    }

    const headers = new Headers();
    if (remoteImage.contentType) {
      headers.set('Content-Type', remoteImage.contentType);
    }
    applyImageCacheHeaders(headers);

    return new Response(remoteImage.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return buildFallbackImageResponse();
  }
}
