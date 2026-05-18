import { NextResponse } from 'next/server';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput, timingSafeEqual, isAdminIpWhitelisted, ipBlockedResponse } from '@/lib/security';

// Telemetry logs stay in-memory (ephemeral by design — lightweight, high-frequency writes)
// For production persistence, add a `system_logs` Supabase table and batch-insert.

interface LogItem {
  id: string;
  timestamp: string;
  tag: 'GAMEPLAY' | 'WALLET' | 'SUPPORT' | 'SYSTEM' | 'SECURITY';
  message: string;
}

const globalForLogs = global as unknown as { systemLogs: LogItem[] };

const systemLogs: LogItem[] = globalForLogs.systemLogs || [
  { id: '1', timestamp: new Date().toLocaleTimeString(), tag: 'SYSTEM', message: '🚀 BlastPay Core Terminal Initialized — Supabase Backend Active.' },
  { id: '2', timestamp: new Date().toLocaleTimeString(), tag: 'SECURITY', message: '🔐 Platform security hardening activated. All API routes protected.' },
];

if (process.env.NODE_ENV !== 'production') globalForLogs.systemLogs = systemLogs;

function verifyAdminAuth(request: Request): boolean {
  const pin = request.headers.get('x-admin-pin') ?? '';
  const securePin = process.env.ADMIN_PIN;
  if (!securePin) return false;
  return timingSafeEqual(pin, securePin);
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (!isAdminIpWhitelisted(ip)) return ipBlockedResponse(ip);
  if (isRateLimited(`admin-logs-get:${ip}`, 30, 60_000)) return rateLimitedResponse();
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(systemLogs);
}

export async function POST(request: Request) {
  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  const ip = getClientIp(request);
  if (!isAdminIpWhitelisted(ip)) return ipBlockedResponse(ip);
  if (isRateLimited(`admin-logs-post:${ip}`, 120, 60_000)) return rateLimitedResponse();

  try {
    const raw = await request.json();
    const { tag, message } = sanitizeInput(raw);

    const newLog: LogItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      tag: tag || 'SYSTEM',
      message: message || '',
    };

    systemLogs.unshift(newLog);
    if (systemLogs.length > 200) systemLogs.pop();

    return NextResponse.json({ status: 'success' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to append log' }, { status: 500 });
  }
}
