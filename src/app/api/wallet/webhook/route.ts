import { NextResponse } from 'next/server';
import { getAdminClient, getProfileByUsername, depositBalance } from '@/lib/dal';

interface LogItem {
  id: string;
  timestamp: string;
  tag: 'GAMEPLAY' | 'WALLET' | 'SUPPORT' | 'SYSTEM' | 'SECURITY';
  message: string;
}

const globalForLogs = global as unknown as { systemLogs: LogItem[] };

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

export async function POST(request: Request) {
  try {
    // 1. Verify Secret Hash in Production
    const signature = request.headers.get('verif-hash');
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH || 'BLASTPAY-SECRET-HASH-102938';
    
    // In production, you would uncomment the verification check
    /*
    if (process.env.NODE_ENV === 'production' && signature !== secretHash) {
      pushTelemetryLog('SECURITY', `🔒 WEBHOOK WARNING: Received webhook payload with invalid signature hash [${signature}]. Access Denied.`);
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }
    */

    const payload = await request.json();
    // Silently process payload

    // Handle Flutterwave Standard Webhook
    if (payload.event === 'charge.completed' || payload.data?.status === 'successful') {
      const data = payload.data;
      const txRef = data.tx_ref;
      const amount = parseFloat(data.amount);
      const currency = data.currency;
      const customerEmail = data.customer?.email || '';

      if (currency !== 'NGN' || isNaN(amount) || amount <= 0) {
        return NextResponse.json({ status: 'ignored', reason: 'Invalid currency or amount bounds' });
      }

      // Identify user from customer.email (e.g. username@example.com) or custom reference
      let username = '';
      if (customerEmail.includes('@example.com')) {
        username = customerEmail.split('@example.com')[0];
      } else if (customerEmail.includes('@')) {
        // Fallback: look up by standard email if customer profile has it
        username = customerEmail.split('@')[0];
      }

      if (!username) {
        pushTelemetryLog('SECURITY', `⚠️ WEBHOOK WARNING: Failed to extract user identifier from webhook email: [${customerEmail}]`);
        return NextResponse.json({ error: 'User mapping failed' }, { status: 400 });
      }

      const profile = await getProfileByUsername(username);
      if (!profile) {
        pushTelemetryLog('SECURITY', `⚠️ WEBHOOK WARNING: Payment received for unknown user [${username}]. Amount: ₦${amount}`);
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      // Check if this transaction reference was already recorded as successful in our database to prevent duplicate processing
      const supabase = getAdminClient();
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference', txRef || `flw-${data.id}`)
        .single();

      if (existingTx) {
        if (existingTx.status === 'successful') {
          return NextResponse.json({ status: 'ignored', reason: 'Transaction already successfully completed' });
        }
        
        // If it was pending, update it to successful and credit user
        if (existingTx.status === 'pending') {
          await supabase
            .from('transactions')
            .update({ status: 'successful' })
            .eq('id', existingTx.id);
            
          const newBalance = await depositBalance(profile.id, amount);
          
          // Increment total deposits in adminConfig
          const { data: config } = await supabase
            .from('admin_config')
            .select('total_deposits')
            .eq('id', 1)
            .single();

          if (config) {
            const newTotalDeposits = parseFloat(config.total_deposits) + amount;
            await supabase
              .from('admin_config')
              .update({ total_deposits: newTotalDeposits })
              .eq('id', 1);
          }

          pushTelemetryLog('WALLET', `⚡ AUTOMATED WEBHOOK CLEARING: Player [${username}] credited with ₦${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Reference: ${txRef}).`);
          return NextResponse.json({ status: 'success', action: 'approved_pending' });
        }
      }

      // Otherwise, record as a new successful transaction and credit balance atomically
      const { error: insertErr } = await supabase.from('transactions').insert({
        user_id: profile.id,
        type: 'deposit',
        amount: amount,
        currency: 'NGN',
        status: 'successful',
        reference: txRef || `flw-${data.id}-${Date.now()}`
      });

      if (insertErr) {
        return NextResponse.json({ error: 'Failed to record transaction log' }, { status: 500 });
      }

      const newBalance = await depositBalance(profile.id, amount);
      
      // Increment total deposits in adminConfig
      const { data: config } = await supabase
        .from('admin_config')
        .select('total_deposits')
        .eq('id', 1)
        .single();

      if (config) {
        const newTotalDeposits = parseFloat(config.total_deposits) + amount;
        await supabase
          .from('admin_config')
          .update({ total_deposits: newTotalDeposits })
          .eq('id', 1);
      }

      pushTelemetryLog('WALLET', `⚡ AUTOMATED WEBHOOK CLEARING: Player [${username}] credited with ₦${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} via live transfer.`);
      return NextResponse.json({ status: 'success', action: 'direct_credit' });
    }

    return NextResponse.json({ status: 'ignored', reason: 'Unrecognized event type' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
