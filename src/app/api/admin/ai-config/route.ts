import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isRateLimited, rateLimitedResponse, getClientIp, checkBodySize, sanitizeInput, timingSafeEqual, isAdminIpWhitelisted, ipBlockedResponse } from '@/lib/security';

interface LogItem {
  id: string;
  timestamp: string;
  tag: 'GAMEPLAY' | 'WALLET' | 'SUPPORT' | 'SYSTEM' | 'SECURITY';
  message: string;
}

const globalForLogs = global as unknown as { systemLogs: LogItem[] };

function verifyAdminAuth(request: Request): boolean {
  const pin = request.headers.get('x-admin-pin') ?? '';
  const securePin = process.env.ADMIN_PIN;
  if (!securePin) return false;
  return timingSafeEqual(pin, securePin);
}

function pushTelemetryLog(tag: 'GAMEPLAY' | 'WALLET' | 'SUPPORT' | 'SYSTEM' | 'SECURITY', message: string) {
  if (!globalForLogs.systemLogs) {
    globalForLogs.systemLogs = [];
  }
  const newLog: LogItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleTimeString(),
    tag,
    message,
  };
  globalForLogs.systemLogs.unshift(newLog);
  if (globalForLogs.systemLogs.length > 200) {
    globalForLogs.systemLogs.pop();
  }
}

const CONFIG_PATH = path.join(process.cwd(), 'src/lib/ai_config.json');

function readAiConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read AI config:', err);
  }
  return { aiAutoSettle: true, aiSettleDelayMs: 8000, aiConfidenceThreshold: 0.95 };
}

function writeAiConfig(data: any) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write AI config:', err);
    return false;
  }
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (!isAdminIpWhitelisted(ip)) return ipBlockedResponse(ip);
  if (isRateLimited(`admin-ai-config-get:${ip}`, 30, 60_000)) return rateLimitedResponse();

  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid access credentials' }, { status: 401 });
  }

  const config = readAiConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!isAdminIpWhitelisted(ip)) return ipBlockedResponse(ip);
  if (isRateLimited(`admin-ai-config-post:${ip}`, 20, 60_000)) return rateLimitedResponse();

  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid access credentials' }, { status: 401 });
  }

  const sizeError = checkBodySize(request);
  if (sizeError) return sizeError;

  try {
    const raw = await request.json();
    const patch = sanitizeInput(raw);

    const current = readAiConfig();
    const updated = {
      aiAutoSettle: patch.aiAutoSettle !== undefined ? !!patch.aiAutoSettle : current.aiAutoSettle,
      aiSettleDelayMs: patch.aiSettleDelayMs !== undefined ? Math.max(1000, Math.min(600000, Number(patch.aiSettleDelayMs) || 8000)) : current.aiSettleDelayMs,
      aiConfidenceThreshold: patch.aiConfidenceThreshold !== undefined ? Math.max(0.1, Math.min(1.0, Number(patch.aiConfidenceThreshold) || 0.95)) : current.aiConfidenceThreshold
    };

    const success = writeAiConfig(updated);
    if (!success) {
      return NextResponse.json({ error: 'Failed to persist AI parameters' }, { status: 500 });
    }

    pushTelemetryLog(
      'SYSTEM',
      `🤖 AI AUTO-SETTLEMENT ENGINE UPDATED: Engine Status is now [${updated.aiAutoSettle ? 'ACTIVE' : 'SUSPENDED'}], confirmation latency set to [${updated.aiSettleDelayMs}ms]`
    );

    return NextResponse.json({ status: 'success', config: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
