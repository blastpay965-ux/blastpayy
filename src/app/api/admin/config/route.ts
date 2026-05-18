import { NextResponse } from 'next/server';
import { getAdminConfig, updateAdminConfig, getAdminStats } from '@/lib/dal';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput, timingSafeEqual, isAdminIpWhitelisted, ipBlockedResponse } from '@/lib/security';

function verifyAdminAuth(request: Request): boolean {
  const pin = request.headers.get('x-admin-pin') ?? '';
  const securePin = process.env.ADMIN_PIN;
  if (!securePin) return false;
  return timingSafeEqual(pin, securePin);
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (!isAdminIpWhitelisted(ip)) return ipBlockedResponse(ip);
  if (isRateLimited(`admin-config-get:${ip}`, 30, 60_000)) return rateLimitedResponse();
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid access credentials' }, { status: 401 });
  }

  const [config, stats] = await Promise.all([
    getAdminConfig(),
    getAdminStats()
  ]);
  
  return NextResponse.json({ ...config, ...stats });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!isAdminIpWhitelisted(ip)) return ipBlockedResponse(ip);
  if (isRateLimited(`admin-config-post:${ip}`, 20, 60_000)) return rateLimitedResponse();
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid access credentials' }, { status: 401 });
  }

  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const raw = await request.json();
    const data = sanitizeInput(raw);
    const updatedConfig = await updateAdminConfig(data);
    return NextResponse.json({ status: 'success', config: updatedConfig });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Re-export config for the crash game route (reads live config)
export { getAdminConfig as adminConfig };
