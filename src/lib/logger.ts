import { getAdminClient } from './dal';

export interface LogItem {
  id: string;
  timestamp: string;
  tag: 'GAMEPLAY' | 'WALLET' | 'SUPPORT' | 'SYSTEM' | 'SECURITY';
  message: string;
}

const globalForLogs = global as unknown as { systemLogs: LogItem[] };
if (!globalForLogs.systemLogs) {
  globalForLogs.systemLogs = [];
}

/**
 * Push a telemetry log.
 * In a fully productionized environment with database migrations, 
 * this should insert into a 'system_logs' table in Supabase.
 * For now, it uses a centralized in-memory array.
 */
export async function pushTelemetryLog(tag: LogItem['tag'], message: string) {
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

  // Optional: If a 'system_logs' table is created in Supabase later, uncomment below:
  // try {
  //   const supabase = getAdminClient();
  //   await supabase.from('system_logs').insert([newLog]);
  // } catch (e) {
  //   console.error("Failed to push log to db", e);
  // }
}

export async function getTelemetryLogs(): Promise<LogItem[]> {
  return globalForLogs.systemLogs;
}
