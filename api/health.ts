export default async function handler(req: any, res: any) {
  const CANONICAL_URL = 'https://twpauvrjmaqdzrwteksd.supabase.co';
  const url = (process.env.SUPABASE_URL || CANONICAL_URL).trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabaseUrl: url,
    database: 'Supabase PostgreSQL',
    configured: Boolean(url && key)
  });
}
