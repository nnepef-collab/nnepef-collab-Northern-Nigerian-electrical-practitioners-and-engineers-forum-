import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { runServerMigrationIfConfigured, MigrationResult } from './server/dbMigration.js';

// Server-side persistent storage directory
const DATA_DIR = path.join(process.cwd(), 'data');
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');

function initDataStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(MEMBERS_FILE)) {
      fs.writeFileSync(MEMBERS_FILE, JSON.stringify([]), 'utf-8');
    }
    if (!fs.existsSync(PAYMENTS_FILE)) {
      fs.writeFileSync(PAYMENTS_FILE, JSON.stringify([]), 'utf-8');
    }
  } catch (e) {
    console.warn('[DataStore Init Warning]:', e);
  }
}

function readStoredMembers(): any[] {
  try {
    if (fs.existsSync(MEMBERS_FILE)) {
      const content = fs.readFileSync(MEMBERS_FILE, 'utf-8');
      return JSON.parse(content || '[]');
    }
  } catch (e) {
    console.error('[DataStore Read Members Error]:', e);
  }
  return [];
}

function writeStoredMembers(members: any[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(MEMBERS_FILE, JSON.stringify(members, null, 2), 'utf-8');
  } catch (e) {
    console.error('[DataStore Write Members Error]:', e);
  }
}

function readStoredPayments(): any[] {
  try {
    if (fs.existsSync(PAYMENTS_FILE)) {
      const content = fs.readFileSync(PAYMENTS_FILE, 'utf-8');
      return JSON.parse(content || '[]');
    }
  } catch (e) {
    console.error('[DataStore Read Payments Error]:', e);
  }
  return [];
}

function writeStoredPayments(payments: any[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2), 'utf-8');
  } catch (e) {
    console.error('[DataStore Write Payments Error]:', e);
  }
}

async function startServer() {
  initDataStore();
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '25mb' }));

  // Explicitly serve WASM binaries with correct MIME type
  app.get('/sql-wasm.wasm', (_req, res) => {
    res.setHeader('Content-Type', 'application/wasm');
    res.sendFile(path.join(process.cwd(), 'public', 'sql-wasm.wasm'));
  });

  app.get('/sql-wasm.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(process.cwd(), 'public', 'sql-wasm.js'));
  });

  app.use(express.static(path.join(process.cwd(), 'public')));

  const CANONICAL_SUPABASE_URL = 'https://twpauvrjmaqdzrwteksd.supabase.co';
  
  function resolveServerCredentials() {
    const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || CANONICAL_SUPABASE_URL;
    const url = rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const key = serviceRoleKey || (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

    return { url, key, serviceRoleKey };
  }

  const { url: SUPABASE_URL, key: SUPABASE_KEY, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY } = resolveServerCredentials();

  let lastMigrationResult: MigrationResult = {
    attempted: false,
    executed: false,
    message: 'Pending initial server check',
    timestamp: new Date().toISOString()
  };

  // Run database migration if DATABASE_URL or POSTGRES_URL is configured
  runServerMigrationIfConfigured().then(res => {
    lastMigrationResult = res;
    if (res.executed) {
      console.log('[Server Startup] Auto-migration successfully executed:', res.message);
    } else if (res.attempted) {
      console.warn('[Server Startup] Auto-migration attempted with error:', res.error);
    } else {
      console.log('[Server Startup] Auto-migration skipped (no direct DATABASE_URL provided on server).');
    }
  }).catch(err => {
    lastMigrationResult = {
      attempted: true,
      executed: false,
      message: `Unexpected migration error: ${err.message}`,
      error: err.message,
      timestamp: new Date().toISOString()
    };
  });

  // Schema raw download & view endpoint
  app.get('/supabase_schema.sql', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'supabase_schema.sql'));
  });

  app.get('/api/schema.sql', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'supabase_schema.sql'));
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(), 
      supabaseUrl: SUPABASE_URL,
      database: 'Supabase PostgreSQL',
      configured: Boolean(SUPABASE_URL && SUPABASE_KEY),
      migration: {
        attempted: lastMigrationResult.attempted,
        executed: lastMigrationResult.executed,
        message: lastMigrationResult.message
      }
    });
  });

  // Dedicated migration status endpoint
  app.get('/api/admin/migration-status', (_req, res) => {
    res.json({
      success: true,
      databaseConfigured: Boolean(SUPABASE_URL && SUPABASE_KEY),
      migration: lastMigrationResult
    });
  });

  // Trigger manual migration run on demand (if credentials are provided)
  app.post('/api/admin/run-migration', async (_req, res) => {
    try {
      const result = await runServerMigrationIfConfigured();
      lastMigrationResult = result;
      return res.json({ success: result.executed, result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================================================
  // SERVER-SIDE SUPABASE MEMBERS REST API (DIRECT POSTGRESQL PROXY + RESILIENT CACHE)
  // ==========================================================================

  // Helper to sync or write member payload to Supabase PostgreSQL table public.members
  async function syncMemberToSupabase(payload: any) {
    const effectiveKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
    if (!SUPABASE_URL || !effectiveKey) {
      return { success: false, error: 'Supabase credentials not available on server' };
    }
    try {
      // 1. Plain POST to public.members (supports upsert via merge-duplicates)
      const response = await fetch(`${SUPABASE_URL}/rest/v1/members`, {
        method: 'POST',
        headers: {
          'apikey': effectiveKey,
          'Authorization': `Bearer ${effectiveKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 201 || response.status === 200 || response.status === 204) {
        console.log('[Supabase PostgreSQL INSERT/UPSERT Success] Status', response.status, 'for', payload.id, payload.full_name);
        return { success: true, status: response.status };
      }

      // If conflict or RLS requires PATCH, update with PATCH
      if (response.status === 409 || response.status === 400 || response.status === 403) {
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${encodeURIComponent(payload.id)}`, {
          method: 'PATCH',
          headers: {
            'apikey': effectiveKey,
            'Authorization': `Bearer ${effectiveKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (patchRes.ok) {
          console.log('[Supabase PostgreSQL PATCH Success] Status', patchRes.status, 'for', payload.id);
          return { success: true, status: patchRes.status };
        }
      }

      // 2. Try RPC public_register_member fallback
      try {
        const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_register_member`, {
          method: 'POST',
          headers: {
            'apikey': effectiveKey,
            'Authorization': `Bearer ${effectiveKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ p_payload: payload })
        });
        if (rpcRes.ok) {
          console.log('[Supabase RPC Success] public_register_member succeeded for', payload.id);
          return { success: true, status: rpcRes.status };
        }
      } catch (rpcErr) {}

      const errorText = await response.text();
      console.warn('[Supabase Sync Notice]', response.status, errorText);
      return { success: false, status: response.status, error: errorText };
    } catch (e: any) {
      console.error('[Supabase Network Exception]', e.message);
      return { success: false, error: e.message };
    }
  }

  // GET /api/members - Fetch all registered members (merging Supabase live records + server storage)
  app.get('/api/members', async (req, res) => {
    try {
      const stored = readStoredMembers();
      const memberMap = new Map<string, any>();

      // Populate with stored members first
      for (const m of stored) {
        if (m && m.id) memberMap.set(m.id, m);
      }

      if (SUPABASE_URL && SUPABASE_KEY) {
        const clientAuth = req.headers['authorization'];
        let effectiveAuth = `Bearer ${SUPABASE_KEY}`;
        if (clientAuth && typeof clientAuth === 'string' && clientAuth.startsWith('Bearer ') && clientAuth.length > 20) {
          effectiveAuth = clientAuth;
        } else if (SUPABASE_SERVICE_ROLE_KEY) {
          effectiveAuth = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
        }

        try {
          const response = await fetch(`${SUPABASE_URL}/rest/v1/members?select=*&order=registered_at.desc`, {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': effectiveAuth
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              for (const row of data) {
                if (row && row.id) {
                  // Normalize Supabase snake_case row to Member interface
                  const normalized = {
                    id: row.id,
                    membershipId: row.membership_id || '',
                    verificationCode: row.verification_code || row.application_reference || '',
                    applicationReference: row.application_reference || '',
                    firstName: row.first_name || '',
                    middleName: row.middle_name || '',
                    lastName: row.last_name || '',
                    fullName: row.full_name || '',
                    gender: row.gender || 'Male',
                    dob: row.dob || row.date_of_birth || '',
                    dateOfBirth: row.date_of_birth || row.dob || '',
                    phone: row.phone || '',
                    email: row.email || '',
                    nin: row.nin || row.nin_number || '',
                    ninNumber: row.nin_number || row.nin || '',
                    state: row.state || 'Kano',
                    lga: row.lga || 'Kano Municipal',
                    ward: row.ward || '',
                    address: row.address || row.residential_address || '',
                    residentialAddress: row.residential_address || row.address || '',
                    occupation: row.occupation || 'Practitioner',
                    specialization: row.specialization || '',
                    highestQualification: row.qualification || '',
                    qualification: row.qualification || '',
                    membershipType: row.membership_type || 'Full Member',
                    yearsOfExperience: row.years_of_experience || 0,
                    company: row.company || '',
                    photoUrl: row.photo_url || row.passport_url || row.passport_photo_url || '',
                    passportUrl: row.passport_url || row.passport_photo_url || '',
                    passportPhotoUrl: row.passport_photo_url || row.passport_url || '',
                    paymentReceiptUrl: row.payment_receipt_url || '',
                    status: (row.status || 'pending').toLowerCase(),
                    role: row.role || 'Member',
                    position: row.position || 'Member',
                    issueDate: row.issue_date || undefined,
                    expiryDate: row.expiry_date || undefined,
                    notes: row.notes || undefined,
                    approvalNotificationSent: Boolean(row.approval_notification_sent),
                    approvalNotificationSentAt: row.approval_notification_sent_at || undefined,
                    approvedAt: row.approved_at || undefined,
                    approvedBy: row.approved_by || undefined,
                    rejectedBy: row.rejected_by || undefined,
                    rejectionReason: row.rejection_reason || undefined,
                    nextOfKin: row.next_of_kin || {},
                    registeredAt: row.registered_at || new Date().toISOString()
                  };
                  memberMap.set(row.id, normalized);
                }
              }
            }
          }
        } catch (fetchErr) {
          console.warn('[API /members Fetch Supabase Notice]:', fetchErr);
        }
      }

      const mergedMembers = Array.from(memberMap.values()).sort((a, b) => {
        return new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime();
      });

      // Keep disk store updated
      writeStoredMembers(mergedMembers);

      return res.json({ success: true, count: mergedMembers.length, data: mergedMembers });
    } catch (err: any) {
      console.error('[API /members GET Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/members/verify-diagnostic/:id - Secure verification without exposing PII
  app.get('/api/members/verify-diagnostic/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ exists: false, error: 'ID is required' });
      }

      // Check local store first
      const stored = readStoredMembers();
      const localMatch = stored.find(m => 
        m.id === id || 
        (m.membershipId && m.membershipId.toLowerCase() === id.toLowerCase()) ||
        (m.applicationReference && m.applicationReference.toLowerCase() === id.toLowerCase()) ||
        (m.email && m.email.toLowerCase() === id.toLowerCase())
      );

      if (localMatch) {
        return res.json({
          exists: true,
          id: localMatch.id,
          status: localMatch.status,
          membership_id: localMatch.membershipId,
          application_reference: localMatch.applicationReference,
          registered_at: localMatch.registeredAt
        });
      }

      if (SUPABASE_URL && SUPABASE_KEY) {
        // Fallback to querying Supabase
        const response = await fetch(`${SUPABASE_URL}/rest/v1/members?or=(id.eq.${encodeURIComponent(id)},membership_id.ilike.${encodeURIComponent(id)},application_reference.ilike.${encodeURIComponent(id)})&select=id,status,membership_id,application_reference,registered_at&limit=1`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const row = data[0];
            return res.json({
              exists: true,
              id: row.id,
              status: row.status,
              membership_id: row.membership_id,
              application_reference: row.application_reference,
              registered_at: row.registered_at
            });
          }
        }
      }

      return res.json({ exists: false, id });
    } catch (err: any) {
      return res.status(500).json({ exists: false, error: err.message });
    }
  });

  // POST /api/members/verify-public - Secure dual-factor public member verification
  app.post('/api/members/verify-public', async (req, res) => {
    try {
      const { membershipNumber, phoneNumber } = req.body;
      const cleanId = String(membershipNumber || '').trim().toUpperCase();
      const rawPhone = String(phoneNumber || '').trim();
      const digitsOnlyPhone = rawPhone.replace(/\D/g, '');

      if (!cleanId || !rawPhone || digitsOnlyPhone.length < 8) {
        return res.status(400).json({
          verified: false,
          error: 'Both Official Membership ID and a valid Registered Phone Number are required.'
        });
      }

      const effectiveKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
      if (SUPABASE_URL && effectiveKey) {
        try {
          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/members?membership_id=ilike.${encodeURIComponent(cleanId)}&select=id,membership_id,full_name,state,lga,occupation,specialization,membership_type,position,status,passport_url,passport_photo_url,issue_date,expiry_date,approved_at,registered_at,phone&limit=1`,
            {
              headers: {
                'apikey': effectiveKey,
                'Authorization': `Bearer ${effectiveKey}`
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              const row = data[0];
              const statusStr = (row.status || '').toLowerCase();
              if (statusStr === 'approved' || statusStr === 'active') {
                const dbPhoneDigits = String(row.phone || '').replace(/\D/g, '');
                const inputSuffix = digitsOnlyPhone.slice(-8);
                const dbSuffix = dbPhoneDigits.slice(-8);

                if (inputSuffix && dbSuffix && inputSuffix === dbSuffix) {
                  return res.json({
                    verified: true,
                    member: {
                      id: row.id,
                      membershipId: row.membership_id,
                      fullName: row.full_name,
                      state: row.state,
                      lga: row.lga,
                      occupation: row.occupation,
                      specialization: row.specialization,
                      membershipType: row.membership_type,
                      position: row.position || 'Member',
                      status: 'Approved & Certified',
                      passportUrl: row.passport_url || row.passport_photo_url || '',
                      issueDate: row.issue_date,
                      expiryDate: row.expiry_date,
                      approvedAt: row.approved_at,
                      registeredAt: row.registered_at
                    }
                  });
                }
              }
            }
          }
        } catch (supabaseErr) {
          console.warn('[API /members/verify-public Supabase Error]:', supabaseErr);
        }
      }

      // Check local cache
      const stored = readStoredMembers();
      const localMatch = stored.find(m => 
        m.membershipId && m.membershipId.trim().toUpperCase() === cleanId
      );

      if (localMatch) {
        const localStatus = (localMatch.status || '').toLowerCase();
        if (localStatus === 'approved' || localStatus === 'active') {
          const localPhoneDigits = String(localMatch.phone || '').replace(/\D/g, '');
          const inputSuffix = digitsOnlyPhone.slice(-8);
          const localSuffix = localPhoneDigits.slice(-8);

          if (inputSuffix && localSuffix && inputSuffix === localSuffix) {
            return res.json({
              verified: true,
              member: {
                id: localMatch.id,
                membershipId: localMatch.membershipId,
                fullName: localMatch.fullName,
                state: localMatch.state,
                lga: localMatch.lga,
                occupation: localMatch.occupation,
                specialization: localMatch.specialization,
                membershipType: localMatch.membershipType,
                position: localMatch.position || 'Member',
                status: 'Approved & Certified',
                passportUrl: localMatch.passportUrl || localMatch.passportPhotoUrl || '',
                issueDate: localMatch.issueDate,
                expiryDate: localMatch.expiryDate,
                approvedAt: localMatch.approvedAt,
                registeredAt: localMatch.registeredAt
              }
            });
          }
        }
      }

      return res.status(404).json({
        verified: false,
        error: 'Member verification failed. Please verify that both the Official Membership ID and Phone Number match official registration records.'
      });
    } catch (err: any) {
      console.error('[API /members/verify-public Error]', err);
      return res.status(500).json({ verified: false, error: err.message });
    }
  });

  // POST /api/members - Register or save new member
  app.post('/api/members', async (req, res) => {
    try {
      const member = req.body;
      const fullName = (member?.fullName || member?.full_name || member?.name || '').trim();
      if (!member || !member.id || !fullName) {
        return res.status(400).json({ success: false, error: 'Invalid member data: id and fullName are required.' });
      }

      const appRef = member.applicationReference || member.application_reference || `APP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const verCode = member.verificationCode || member.verification_code || `VER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      const payload: any = {
        id: member.id,
        membership_id: member.membershipId || member.membership_id || null,
        verification_code: verCode,
        application_reference: appRef,
        first_name: member.firstName || member.first_name || null,
        middle_name: member.middleName || member.middle_name || null,
        last_name: member.lastName || member.last_name || null,
        full_name: fullName,
        gender: member.gender || 'Male',
        dob: member.dob || member.dateOfBirth || member.date_of_birth || null,
        date_of_birth: member.dateOfBirth || member.date_of_birth || member.dob || null,
        phone: member.phone ? String(member.phone).trim() : null,
        email: member.email ? String(member.email).trim().toLowerCase() : null,
        nin: member.nin ? String(member.nin).trim() : (member.ninNumber || member.nin_number ? String(member.ninNumber || member.nin_number).trim() : null),
        nin_number: member.ninNumber || member.nin_number ? String(member.ninNumber || member.nin_number).trim() : (member.nin ? String(member.nin).trim() : null),
        state: member.state || 'Kano',
        lga: member.lga || 'Kano Municipal',
        ward: member.ward || null,
        address: member.address ? String(member.address).trim() : (member.residentialAddress || member.residential_address ? String(member.residentialAddress || member.residential_address).trim() : null),
        residential_address: member.residentialAddress || member.residential_address ? String(member.residentialAddress || member.residential_address).trim() : (member.address ? String(member.address).trim() : null),
        occupation: member.occupation ? String(member.occupation).trim() : 'Practitioner',
        specialization: member.specialization || null,
        qualification: member.qualification || member.highestQualification || null,
        membership_type: member.membershipType || member.membership_type || 'Full Member',
        years_of_experience: Number(member.yearsOfExperience || member.years_of_experience) || 0,
        company: member.company ? String(member.company).trim() : null,
        photo_url: member.photoUrl || member.photo_url || member.passportUrl || member.passportPhotoUrl || null,
        passport_url: member.passportUrl || member.passportPhotoUrl || member.passport_url || member.passport_photo_url || null,
        passport_photo_url: member.passportPhotoUrl || member.passportUrl || member.passport_photo_url || member.passport_url || null,
        payment_receipt_url: member.paymentReceiptUrl || member.payment_receipt_url || null,
        status: (member.status || 'pending').toLowerCase(),
        role: member.role || 'Member',
        position: member.position || 'Member',
        issue_date: member.issueDate || member.issue_date || null,
        expiry_date: member.expiryDate || member.expiry_date || null,
        notes: member.notes || null,
        approval_notification_sent: member.approvalNotificationSent || member.approval_notification_sent || false,
        approval_notification_sent_at: member.approvalNotificationSentAt || member.approval_notification_sent_at || null,
        approved_at: member.approvedAt || member.approved_at || (member.status === 'approved' ? new Date().toISOString() : null),
        approved_by: member.approvedBy || member.approved_by || (member.status === 'approved' ? 'Super Admin Secretariat' : null),
        rejected_by: member.rejectedBy || member.rejected_by || null,
        rejection_reason: member.rejectionReason || member.rejection_reason || null,
        next_of_kin: member.nextOfKin || member.next_of_kin || {},
        registered_at: member.registeredAt || member.registered_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 1. Save directly to disk store immediately (zero data loss)
      const stored = readStoredMembers();
      const existingIdx = stored.findIndex(m => m.id === member.id);
      if (existingIdx >= 0) {
        stored[existingIdx] = member;
      } else {
        stored.unshift(member);
      }
      writeStoredMembers(stored);

      // 2. Authoritative sync to Supabase PostgreSQL table public.members
      const supabaseResult = await syncMemberToSupabase(payload);

      console.log(`[API /members] Registered: ${member.fullName} (${member.id}) - Supabase synced: ${supabaseResult.success}`);

      return res.status(201).json({
        success: true,
        message: 'Member registered successfully to N-NEPEF database',
        member,
        supabaseResult
      });
    } catch (err: any) {
      console.error('[API /members POST Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /api/members/:id - Update member (approval, status, ID assignment, notes)
  app.put('/api/members/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // 1. Update on disk
      const stored = readStoredMembers();
      const idx = stored.findIndex(m => m.id === id);
      let updatedMember = { id, ...updates };
      if (idx >= 0) {
        stored[idx] = { ...stored[idx], ...updates, id };
        updatedMember = stored[idx];
      } else {
        stored.push(updatedMember);
      }
      writeStoredMembers(stored);

      // 2. Sync updates to Supabase PostgreSQL
      const payload: any = {
        updated_at: new Date().toISOString()
      };
      if (updates.status) payload.status = String(updates.status).toLowerCase();
      if (updates.membershipId !== undefined) payload.membership_id = updates.membershipId;
      if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
      if (updates.approvedBy !== undefined) payload.approved_by = updates.approvedBy;
      if (updates.rejectedBy !== undefined) payload.rejected_by = updates.rejectedBy;
      if (updates.rejectionReason !== undefined) payload.rejection_reason = updates.rejectionReason;
      if (updates.position !== undefined) payload.position = updates.position;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      if (updates.paymentReceiptUrl !== undefined) payload.payment_receipt_url = updates.paymentReceiptUrl;
      if (updates.approvalNotificationSent !== undefined) payload.approval_notification_sent = updates.approvalNotificationSent;
      if (updates.approvalNotificationSentAt !== undefined) payload.approval_notification_sent_at = updates.approvalNotificationSentAt;

      const effectiveKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
      if (SUPABASE_URL && effectiveKey) {
        try {
          // If status is approved, try calling the dedicated admin_approve_member RPC
          if (payload.status === 'approved') {
            try {
              await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_approve_member`, {
                method: 'POST',
                headers: {
                  'apikey': effectiveKey,
                  'Authorization': `Bearer ${effectiveKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  p_member_id: id,
                  p_membership_id: payload.membership_id || null,
                  p_approved_by: payload.approved_by || 'Super Admin Secretariat',
                  p_position: payload.position || 'Member'
                })
              });
            } catch (rpcApproveErr) {}
          }

          await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: {
              'apikey': effectiveKey,
              'Authorization': `Bearer ${effectiveKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
        } catch (patchErr) {
          console.warn('[Supabase PATCH Notice]:', patchErr);
        }
      }

      return res.json({ success: true, member: updatedMember });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/members/approve - Dedicated member approval endpoint
  app.post('/api/members/approve', async (req, res) => {
    try {
      const { memberId, membershipId, approvedBy, position, issueDate, expiryDate } = req.body;
      if (!memberId) {
        return res.status(400).json({ success: false, error: 'memberId is required' });
      }

      const stored = readStoredMembers();
      const idx = stored.findIndex(m => m.id === memberId);
      let updatedMember: any = null;

      if (idx >= 0) {
        stored[idx] = {
          ...stored[idx],
          status: 'approved',
          membershipId: membershipId || stored[idx].membershipId,
          position: position || stored[idx].position || 'Member',
          issueDate: issueDate || stored[idx].issueDate || new Date().toISOString().split('T')[0],
          expiryDate: expiryDate || stored[idx].expiryDate || new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          approvedAt: new Date().toISOString(),
          approvedBy: approvedBy || 'Super Admin Secretariat',
          approvalNotificationSent: true,
          approvalNotificationSentAt: new Date().toISOString()
        };
        updatedMember = stored[idx];
        writeStoredMembers(stored);
      }

      const effectiveKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
      if (SUPABASE_URL && effectiveKey) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_approve_member`, {
            method: 'POST',
            headers: {
              'apikey': effectiveKey,
              'Authorization': `Bearer ${effectiveKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              p_member_id: memberId,
              p_membership_id: membershipId || null,
              p_approved_by: approvedBy || 'Super Admin Secretariat',
              p_position: position || 'Member',
              p_issue_date: issueDate || null,
              p_expiry_date: expiryDate || null
            })
          });
        } catch (rpcErr) {
          console.warn('[Supabase admin_approve_member RPC Error]:', rpcErr);
        }
      }

      return res.json({ success: true, member: updatedMember });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/members/:id - Delete a member
  app.delete('/api/members/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // 1. Delete from disk
      const stored = readStoredMembers();
      const filtered = stored.filter(m => m.id !== id);
      writeStoredMembers(filtered);

      // 2. Delete from Supabase
      const effectiveKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
      if (SUPABASE_URL && effectiveKey) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
              'apikey': effectiveKey,
              'Authorization': `Bearer ${effectiveKey}`
            }
          });
        } catch (delErr) {
          console.warn('[Supabase DELETE Notice]:', delErr);
        }
      }

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET & POST /api/payments - Payments proxy for Supabase PostgreSQL
  app.get('/api/payments', async (_req, res) => {
    try {
      const storedPayments = readStoredPayments();
      const paymentMap = new Map<string, any>();

      for (const p of storedPayments) {
        if (p && p.id) paymentMap.set(p.id, p);
      }

      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          const response = await fetch(`${SUPABASE_URL}/rest/v1/payment_records?select=*&order=date.desc`, {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              for (const row of data) {
                if (row && row.id) {
                  paymentMap.set(row.id, {
                    id: row.id,
                    memberId: row.member_id,
                    memberName: row.member_name,
                    membershipId: row.membership_id,
                    state: row.state,
                    lga: row.lga,
                    type: row.type,
                    amount: row.amount,
                    status: row.status,
                    receiptUrl: row.receipt_url,
                    date: row.date,
                    reference: row.reference,
                    paymentMethod: row.payment_method,
                    remarks: row.remarks,
                    rejectionReason: row.rejection_reason,
                    approvedAt: row.approved_at,
                    approvedBy: row.approved_by
                  });
                }
              }
            }
          }
        } catch (payFetchErr) {
          console.warn('[Supabase Payments Fetch Notice]:', payFetchErr);
        }
      }

      const mergedPayments = Array.from(paymentMap.values()).sort((a, b) => {
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      });

      writeStoredPayments(mergedPayments);
      return res.json({ success: true, count: mergedPayments.length, data: mergedPayments });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/payments', async (req, res) => {
    try {
      const p = req.body;
      if (!p || !p.id) return res.status(400).json({ success: false, error: 'Payment id is required' });

      // Save to disk
      const stored = readStoredPayments();
      const pIdx = stored.findIndex(item => item.id === p.id);
      if (pIdx >= 0) {
        stored[pIdx] = p;
      } else {
        stored.unshift(p);
      }
      writeStoredPayments(stored);

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
        try {
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
        } catch (paySyncErr) {
          console.warn('[Supabase Payments Sync Notice]:', paySyncErr);
        }
      }

      return res.json({ success: true, payment: p });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Serve Vite in development mode or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] N-NEPEF 2020 Portal Dev Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
