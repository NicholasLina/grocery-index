import { NextResponse } from 'next/server';
import * as staticData from '../../../../lib/staticData';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: staticData.isStaticDataAvailable() ? 'ok' : 'degraded',
    storage: {
      driver: 'static-json',
      ready: staticData.isStaticDataAvailable(),
    },
  });
}
