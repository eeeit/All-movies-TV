/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import type { ServerConfigApiResponse } from '@shared/api-contract';

import { getConfig } from '@/lib/config';
export async function GET(request: NextRequest) {
  console.log('server-config called: ', request.url);

  const config = await getConfig();
  const result: ServerConfigApiResponse = {
    SiteName: config.SiteConfig.SiteName,
    StorageType: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
  };
  return NextResponse.json(result);
}
