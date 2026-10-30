import { NextResponse } from 'next/server';

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// جلب البيانات من قاعدة البيانات السحابية
export async function GET() {
  try {
    if (!KV_URL || !KV_TOKEN) {
      return NextResponse.json({ custodyFund: { amount: 50000, currency: 'LYD', recipient: 'أحمد الصالحي', custodyNo: 'CUS-2026-001' }, invoices: [], custodyHistory: [] });
    }

    const res = await fetch(`${KV_URL}/get/cement_custody_data`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: 'no-store'
    });
    const data = await res.json();
    const result = data.result ? JSON.parse(data.result) : null;

    return NextResponse.json(result || {
      custodyFund: { amount: 50000, currency: 'LYD', recipient: 'أحمد الصالحي', custodyNo: 'CUS-2026-001' },
      invoices: [],
      custodyHistory: []
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// حفظ البيانات في قاعدة البيانات السحابية
export async function POST(request) {
  try {
    const body = await request.json();
    if (KV_URL && KV_TOKEN) {
      await fetch(`${KV_URL}/set/cement_custody_data`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(JSON.stringify(body))
      });
    }
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
