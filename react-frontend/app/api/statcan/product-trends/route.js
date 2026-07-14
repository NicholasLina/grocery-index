import { NextResponse } from 'next/server';
import * as staticData from '../../../../lib/staticData';

export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET(request) {
  if (!staticData.isStaticDataAvailable()) {
    return NextResponse.json({ error: 'Static data unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const geo = searchParams.get('geo');
  if (!geo) {
    return NextResponse.json({ error: 'Geographic location (geo) is required' }, { status: 400 });
  }

  const payload = staticData.getProductTrends(
    geo,
    Number(searchParams.get('limit') ?? 6),
    Number(searchParams.get('months') ?? searchParams.get('points') ?? 12)
  );

  if (!payload) {
    return NextResponse.json({ error: 'Region not found' }, { status: 404 });
  }

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
