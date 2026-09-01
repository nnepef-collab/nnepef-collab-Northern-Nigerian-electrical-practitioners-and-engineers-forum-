export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, apikey, Prefer'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const CANONICAL_URL = 'https://twpauvrjmaqdzrwteksd.supabase.co';
  const SUPABASE_URL = (process.env.SUPABASE_URL || CANONICAL_URL).trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  // Parse body safely if received as raw string
  let rawBody = req.body;
  if (typeof rawBody === 'string') {
    try {
      rawBody = JSON.parse(rawBody);
    } catch {
      rawBody = {};
    }
  }

  if (req.method === 'GET') {
    try {
      if (SUPABASE_URL && SUPABASE_KEY) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/payment_records?select=*&order=date.desc`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          return res.status(200).json({ success: true, count: data.length, data });
        }
      }
      return res.status(200).json({ success: true, count: 0, data: [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const p = rawBody;
      if (!p || !p.id) return res.status(400).json({ success: false, error: 'Payment id is required' });

      const payload: any = {
        id: p.id,
        member_id: p.memberId || p.member_id,
        member_name: p.memberName || p.member_name,
        membership_id: p.membershipId || p.membership_id,
        state: p.state || null,
        lga: p.lga || null,
        type: p.type,
        amount: Number(p.amount) || 0,
        status: p.status,
        receipt_url: p.receiptUrl || p.receipt_url,
        date: p.date || new Date().toISOString(),
        reference: p.reference,
        payment_method: p.paymentMethod || p.payment_method || 'Bank Transfer',
        remarks: p.remarks || null,
        rejection_reason: p.rejectionReason || p.rejection_reason || null,
        approved_at: p.approvedAt || p.approved_at || null,
        approved_by: p.approvedBy || p.approved_by || null
      };

      if (SUPABASE_URL && SUPABASE_KEY) {
        await fetch(`${SUPABASE_URL}/rest/v1/payment_records`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });
      }

      return res.status(200).json({ success: true, payment: p });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
