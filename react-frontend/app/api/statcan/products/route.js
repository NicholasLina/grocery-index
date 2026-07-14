import { NextResponse } from 'next/server';
import * as staticData from '../../../../lib/staticData';

export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET() {
  if (!staticData.isStaticDataAvailable()) {
    return NextResponse.json({ error: 'Static data unavailable' }, { status: 503 });
  }

  return NextResponse.json(staticData.getProducts(), {
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
