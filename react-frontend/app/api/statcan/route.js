import { NextResponse } from 'next/server';
import * as staticData from '../../../lib/staticData';

export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET(request) {
  if (!staticData.isStaticDataAvailable()) {
    return NextResponse.json({ error: 'Static data unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const rows = staticData.querySourcePrices({
    date: searchParams.get('date') ?? undefined,
    geo: searchParams.get('geo') ?? undefined,
    product: searchParams.get('product') ?? undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
  });

  return NextResponse.json(rows, {
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
