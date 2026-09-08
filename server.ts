import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { runServerMigrationIfConfigured, MigrationResult } from './server/dbMigration.js';

async function startServer() {
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

  const CANONICAL_SUPABASE_URL = 'https://lairqvcbocecspsswshg.supabase.co';
  
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
  // ==========================================================================
  // SERVER-SIDE SUPABASE MEMBERS REST API (DIRECT POSTGRESQL PROXY)
  // Supabase PostgreSQL is the ONLY production source of truth.
  // ==========================================================================

  function cleanMemberDbPayload(member: any) {
    let qualObj: any = {};
    const rawQual = member.qualification_details || member.qualificationDetails;
    if (rawQual) {
      if (typeof rawQual === 'object' && rawQual !== null) {
        qualObj = rawQual;
      } else if (typeof rawQual === 'string') {
        try {
          qualObj = JSON.parse(rawQual);
        } catch (e) {}
      }
    }

    const educationDetails = {
      institution: (member.institution || qualObj.institution || member.company_name || member.company || '').trim(),
      courseOfStudy: (member.courseOfStudy || qualObj.courseOfStudy || member.course_of_study || '').trim(),
      graduationYear: (member.graduationYear || qualObj.graduationYear || member.graduation_year || '').trim(),
      highestQualification: (member.highestQualification || qualObj.highestQualification || member.qualification || '').trim(),
      otherQualifications: (member.otherQualifications || qualObj.otherQualifications || member.other_qualifications || '').trim(),
      professionalCertificates: (member.professionalCertificates || qualObj.professionalCertificates || member.professional_certificates || '').trim()
    };

    let nextOfKinObj = member.nextOfKin || member.next_of_kin;
    if (typeof nextOfKinObj === 'string') {
      try {
        nextOfKinObj = JSON.parse(nextOfKinObj);
      } catch (e) {
        nextOfKinObj = { name: nextOfKinObj };
      }
    }
    if (!nextOfKinObj || typeof nextOfKinObj !== 'object') {
      nextOfKinObj = {};
    }

    const cleanNextOfKin = {
      name: String(nextOfKinObj.name || '').trim(),
      relation: String(nextOfKinObj.relation || '').trim() || 'Spouse',
      phone: String(nextOfKinObj.phone || member.next_of_kin_phone || '').trim(),
      address: String(nextOfKinObj.address || '').trim(),
      altPhone: nextOfKinObj.altPhone ? String(nextOfKinObj.altPhone).trim() : undefined
    };

    const payload: Record<string, any> = {
      full_name: (member.fullName || member.full_name || member.name || '').trim(),
      gender: member.gender || 'Male',
      date_of_birth: member.dateOfBirth || member.date_of_birth || member.dob || null,
      phone: member.phone ? String(member.phone).trim() : null,
      email: member.email ? String(member.email).trim().toLowerCase() : null,
      nin: member.nin ? String(member.nin).trim() : (member.ninNumber || member.nin_number ? String(member.ninNumber || member.nin_number).trim() : null),
      state: member.state || 'Kano',
      lga: member.lga || 'Kano Municipal',
      residential_address: member.residentialAddress || member.residential_address || member.address ? String(member.residentialAddress || member.residential_address || member.address).trim() : null,
      occupation: member.occupation ? String(member.occupation).trim() : 'Practitioner',
      specialization: member.specialization || null,
      qualification: educationDetails.highestQualification || member.highestQualification || member.qualification || null,
      qualification_details: JSON.stringify(educationDetails),
      company_name: educationDetails.institution || member.company || member.company_name || null,
      years_of_experience: Number(member.yearsOfExperience || member.years_of_experience) || 0,
      membership_type: member.membershipType || member.membership_type || 'Full Member',
      passport_url: member.passportUrl || member.passportPhotoUrl || member.passport_url || member.passport_photo_url || member.photoUrl || member.photo_url || null,
      payment_receipt_url: member.paymentReceiptUrl || member.payment_receipt_url || null,
      status: (member.status || 'pending').toLowerCase(),
      position: member.position || 'Member',
      next_of_kin: JSON.stringify(cleanNextOfKin),
      next_of_kin_phone: cleanNextOfKin.phone || null,
      updated_at: new Date().toISOString()
    };

    if (member.id) payload.id = member.id;
    if (member.membershipId || member.membership_id) payload.membership_id = member.membershipId || member.membership_id;
    if (member.verificationCode || member.verification_code) payload.verification_code = member.verificationCode || member.verification_code;
    if (member.applicationReference || member.application_reference) payload.application_reference = member.applicationReference || member.application_reference;
    if (member.registeredAt || member.registered_at) payload.registered_at = member.registeredAt || member.registered_at;
    if (member.expiryDate || member.expiry_date) payload.expiry_date = member.expiryDate || member.expiry_date;
    if (member.approvedBy || member.approved_by) payload.approved_by = member.approvedBy || member.approved_by;
    if (member.approvedAt || member.approved_at) payload.approved_at = member.approvedAt || member.approved_at;
    if (member.rejectionReason || member.rejection_reason) payload.rejection_reason = member.rejectionReason || member.rejection_reason;

    return payload;
  }

  // Helper to sync or write member payload directly to Supabase PostgreSQL table public.members
  async function syncMemberToSupabase(rawMember: any) {
    const effectiveKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
    if (!SUPABASE_URL || !effectiveKey) {
      return { success: false, error: 'Supabase credentials not available on server' };
    }

    const payload = cleanMemberDbPayload(rawMember);

    try {
      // 1. UNCONDITIONAL DUPLICATE PREVENTION:
      // Search Supabase PostgreSQL for an existing member record matching Phone, NIN, or Email FIRST.
      // Unauthenticated clients cannot reliably see pending records due to RLS, so this server-side check is authoritative.
      const rawPhone = payload.phone ? String(payload.phone).trim() : '';
      const digitsOnlyPhone = rawPhone.replace(/\D/g, '');
      const last10Phone = digitsOnlyPhone.length >= 10 ? digitsOnlyPhone.slice(-10) : digitsOnlyPhone;

      const cleanNin = payload.nin ? String(payload.nin).replace(/\D/g, '').trim() : '';
      const cleanEmail = payload.email ? String(payload.email).trim().toLowerCase() : '';

      let existingRow: any = null;

      // UNCONDITIONALLY search by Phone, NIN, or Email FIRST (regardless of payload.id)
      const orFilters: string[] = [];
      if (rawPhone) {
        orFilters.push(`phone.eq.${encodeURIComponent(rawPhone)}`);
      }
      if (last10Phone && last10Phone.length === 10) {
        orFilters.push(`phone.eq.${encodeURIComponent('0' + last10Phone)}`);
        orFilters.push(`phone.eq.${encodeURIComponent('+234' + last10Phone)}`);
        orFilters.push(`phone.eq.${encodeURIComponent('234' + last10Phone)}`);
      }
      if (cleanNin && cleanNin.length >= 7) {
        orFilters.push(`nin.eq.${encodeURIComponent(cleanNin)}`);
      }
      if (cleanEmail && cleanEmail.includes('@') && !cleanEmail.endsWith('@temp.com')) {
        orFilters.push(`email.ilike.${encodeURIComponent(cleanEmail)}`);
      }

      const uniqueFilters = Array.from(new Set(orFilters));

      if (uniqueFilters.length > 0) {
        try {
          const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/members?or=(${uniqueFilters.join(',')})&select=*&order=created_at.asc&limit=1`, {
            headers: {
              'apikey': effectiveKey,
              'Authorization': `Bearer ${effectiveKey}`
            }
          });
          if (checkRes.ok) {
            const existingRows = await checkRes.json();
            if (Array.isArray(existingRows) && existingRows.length > 0 && existingRows[0].id) {
              existingRow = existingRows[0];
              console.log('[Supabase Sync] Matched existing member by Phone/NIN/Email to prevent duplicate record. ID:', existingRow.id, 'Phone:', existingRow.phone, 'NIN:', existingRow.nin);
            }
          }
        } catch (checkErr) {
          console.warn('[Supabase Sync lookup notice]:', checkErr);
        }
      }

      // If not matched by Phone/NIN/Email, check if payload.id exists in database
      if (!existingRow && payload.id && !payload.id.startsWith('m-')) {
        try {
          const idCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${encodeURIComponent(payload.id)}&select=*&limit=1`, {
            headers: {
              'apikey': effectiveKey,
              'Authorization': `Bearer ${effectiveKey}`
            }
          });
          if (idCheckRes.ok) {
            const idRows = await idCheckRes.json();
            if (Array.isArray(idRows) && idRows.length > 0) {
              existingRow = idRows[0];
            }
          }
        } catch (idErr) {
          console.warn('[Supabase Sync ID check notice]:', idErr);
        }
      }

      // C) If an existing record was found, REUSE its ID and PRESERVE populated authentic fields:
      if (existingRow) {
        payload.id = existingRow.id;

        // Preserve approved status so re-registration or profile update does not revoke approval
        if (existingRow.status === 'approved') {
          payload.status = 'approved';
        }
        if (existingRow.membership_id && !payload.membership_id) {
          payload.membership_id = existingRow.membership_id;
        }
        if (existingRow.registered_at && !payload.registered_at) {
          payload.registered_at = existingRow.registered_at;
        }

        // Preserve authentic passport photo if incoming is empty or placeholder
        const isPlaceholderPassport = !payload.passport_url || payload.passport_url.includes('images.unsplash.com');
        if (isPlaceholderPassport && existingRow.passport_url) {
          payload.passport_url = existingRow.passport_url;
        }

        // Preserve authentic payment receipt if incoming is empty or placeholder
        const isPlaceholderReceipt = !payload.payment_receipt_url || payload.payment_receipt_url.includes('images.unsplash.com');
        if (isPlaceholderReceipt && existingRow.payment_receipt_url) {
          payload.payment_receipt_url = existingRow.payment_receipt_url;
        }

        // Preserve and deep-merge qualification_details (School/Education info)
        if (existingRow.qualification_details) {
          try {
            const prevQ = typeof existingRow.qualification_details === 'string' ? JSON.parse(existingRow.qualification_details) : existingRow.qualification_details;
            const newQ = typeof payload.qualification_details === 'string' ? JSON.parse(payload.qualification_details) : payload.qualification_details;
            const mergedQ = {
              institution: newQ.institution || prevQ.institution || '',
              courseOfStudy: newQ.courseOfStudy || prevQ.courseOfStudy || '',
              graduationYear: newQ.graduationYear || prevQ.graduationYear || '',
              highestQualification: newQ.highestQualification || prevQ.highestQualification || '',
              otherQualifications: newQ.otherQualifications || prevQ.otherQualifications || '',
              professionalCertificates: newQ.professionalCertificates || prevQ.professionalCertificates || ''
            };
            payload.qualification_details = JSON.stringify(mergedQ);
            if (!payload.company_name && (prevQ.institution || existingRow.company_name)) {
              payload.company_name = prevQ.institution || existingRow.company_name;
            }
          } catch (e) {}
        }

        // Preserve and deep-merge next of kin details
        if (existingRow.next_of_kin) {
          try {
            const prevN = typeof existingRow.next_of_kin === 'string' ? JSON.parse(existingRow.next_of_kin) : existingRow.next_of_kin;
            const newN = typeof payload.next_of_kin === 'string' ? JSON.parse(payload.next_of_kin) : payload.next_of_kin;
            const mergedN = {
              name: newN.name || prevN.name || '',
              relation: newN.relation || prevN.relation || 'Spouse',
              phone: newN.phone || prevN.phone || '',
              address: newN.address || prevN.address || ''
            };
            payload.next_of_kin = JSON.stringify(mergedN);
            if (!payload.next_of_kin_phone && (newN.phone || prevN.phone || existingRow.next_of_kin_phone)) {
              payload.next_of_kin_phone = newN.phone || prevN.phone || existingRow.next_of_kin_phone;
            }
          } catch (e) {}
        }
      }

      // If still no valid UUID, generate a standard random UUID
      if (!payload.id || payload.id.startsWith('m-')) {
        payload.id = crypto.randomUUID();
      }

      // 2. Authoritative direct atomic UPSERT to Supabase PostgreSQL table public.members
      // This preserves ALL fields in a single atomic transaction: photos, education info, next of kin!
      const response = await fetch(`${SUPABASE_URL}/rest/v1/members`, {
        method: 'POST',
        headers: {
          'apikey': effectiveKey,
          'Authorization': `Bearer ${effectiveKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 201 || response.status === 200) {
        const savedRows = await response.json().catch(() => [payload]);
        const savedRow = Array.isArray(savedRows) && savedRows[0] ? savedRows[0] : payload;
        console.log('[Supabase PostgreSQL UPSERT Success] Saved single record for:', savedRow.id, savedRow.full_name);
        return { success: true, status: response.status, member: savedRow };
      }

      // 3. If standard upsert returned 204 or conflict, execute targeted PATCH on id
      if (payload.id) {
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${encodeURIComponent(payload.id)}`, {
          method: 'PATCH',
          headers: {
            'apikey': effectiveKey,
            'Authorization': `Bearer ${effectiveKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(payload)
        });
        if (patchRes.ok) {
          const patchRows = await patchRes.json().catch(() => [payload]);
          const patchRow = Array.isArray(patchRows) && patchRows[0] ? patchRows[0] : payload;
          console.log('[Supabase PostgreSQL PATCH Success] Saved single record for:', patchRow.id);
          return { success: true, status: patchRes.status, member: patchRow };
        }
      }

      const errorText = await response.text();
      console.warn('[Supabase Sync Notice]', response.status, errorText);
      return { success: false, status: response.status, error: errorText };
    } catch (e: any) {
      console.error('[Supabase Network Exception]', e.message);
      return { success: false, error: e.message };
    }
  }

  // GET /api/members - Fetch all registered members directly from Supabase PostgreSQL
  app.get('/api/members', async (req, res) => {
    try {
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ success: false, error: 'Supabase URL or Key not configured on server' });
      }

      const clientAuth = req.headers['authorization'];
      let effectiveAuth = `Bearer ${SUPABASE_KEY}`;
      let effectiveApiKey = SUPABASE_KEY;

      if (SUPABASE_SERVICE_ROLE_KEY) {
        effectiveAuth = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
        effectiveApiKey = SUPABASE_SERVICE_ROLE_KEY;
      } else if (clientAuth && typeof clientAuth === 'string' && clientAuth.startsWith('Bearer ') && clientAuth.split('.').length === 3) {
        effectiveAuth = clientAuth;
      } else {
        console.warn('[Server /api/members] Note: SUPABASE_SERVICE_ROLE_KEY is not set in the server environment. The query will use public/anon credentials and will be subject to the RLS policy "Public Verification Approved Only".');
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/members?select=*&order=registered_at.desc`, {
        headers: {
          'apikey': effectiveApiKey,
          'Authorization': effectiveAuth
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ success: false, error: errorText });
      }

      const data = await response.json();
      const members: any[] = [];
      if (Array.isArray(data)) {
        for (const row of data) {
          if (row && row.id) {
            let qualDetails: any = {};
            if (row.qualification_details) {
              if (typeof row.qualification_details === 'object') {
                qualDetails = row.qualification_details;
              } else if (typeof row.qualification_details === 'string') {
                try {
                  qualDetails = JSON.parse(row.qualification_details);
                } catch (e) {}
              }
            }

            let nextOfKinObj: any = {};
            if (row.next_of_kin) {
              if (typeof row.next_of_kin === 'object') {
                nextOfKinObj = row.next_of_kin;
              } else if (typeof row.next_of_kin === 'string') {
                try {
                  nextOfKinObj = JSON.parse(row.next_of_kin);
                } catch (e) {}
              }
            }
            if (!nextOfKinObj.phone && row.next_of_kin_phone) {
              nextOfKinObj.phone = row.next_of_kin_phone;
            }

            members.push({
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
              highestQualification: qualDetails.highestQualification || row.qualification || '',
              qualification: row.qualification || qualDetails.highestQualification || '',
              courseOfStudy: qualDetails.courseOfStudy || '',
              institution: qualDetails.institution || row.company_name || row.company || '',
              graduationYear: qualDetails.graduationYear || '',
              otherQualifications: qualDetails.otherQualifications || '',
              professionalCertificates: qualDetails.professionalCertificates || '',
              membershipType: row.membership_type || 'Full Member',
              yearsOfExperience: row.years_of_experience || 0,
              company: qualDetails.institution || row.company || row.company_name || '',
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
              nextOfKin: nextOfKinObj,
              registeredAt: row.registered_at || new Date().toISOString()
            });
          }
        }
      }

      return res.json({ success: true, count: members.length, data: members });
    } catch (err: any) {
      console.error('[API /members GET Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/members/verify-diagnostic/:id - Direct Supabase verification without exposing PII
  app.get('/api/members/verify-diagnostic/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ exists: false, error: 'ID is required' });
      }

      const effectiveKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
      if (!SUPABASE_URL || !effectiveKey) {
        return res.status(503).json({ exists: false, error: 'Supabase credentials not available' });
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/members?or=(id.eq.${encodeURIComponent(id)},membership_id.ilike.${encodeURIComponent(id)},application_reference.ilike.${encodeURIComponent(id)},email.ilike.${encodeURIComponent(id)})&select=id,status,membership_id,application_reference,registered_at&limit=1`, {
        headers: {
          'apikey': effectiveKey,
          'Authorization': `Bearer ${effectiveKey}`
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

      return res.json({ exists: false, id });
    } catch (err: any) {
      return res.status(500).json({ exists: false, error: err.message });
    }
  });

  // POST /api/members/verify-public - Secure dual-factor public member verification via Supabase
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
      if (!SUPABASE_URL || !effectiveKey) {
        return res.status(503).json({ verified: false, error: 'Supabase credentials not available' });
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/members?membership_id=ilike.${encodeURIComponent(cleanId)}&select=id,membership_id,full_name,state,lga,occupation,specialization,membership_type,position,status,passport_url,expiry_date,approved_at,registered_at,phone&limit=1`,
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

      return res.status(404).json({
        verified: false,
        error: 'Member verification failed. Please verify that both the Official Membership ID and Phone Number match official registration records.'
      });
    } catch (err: any) {
      console.error('[API /members/verify-public Error]', err);
      return res.status(500).json({ verified: false, error: err.message });
    }
  });

  // POST /api/members - Register or save new member to Supabase PostgreSQL
  app.post('/api/members', async (req, res) => {
    try {
      const member = req.body;
      const fullName = (member?.fullName || member?.full_name || member?.name || '').trim();
      if (!member || !fullName) {
        return res.status(400).json({ success: false, error: 'Invalid member data: fullName is required.' });
      }

      // Authoritative sync directly to Supabase PostgreSQL table public.members
      const supabaseResult = await syncMemberToSupabase(member);

      if (supabaseResult.success) {
        const finalMember = supabaseResult.member || member;
        return res.status(201).json({
          success: true,
          message: 'Member registered successfully to Supabase PostgreSQL database',
          member: finalMember,
          supabaseResult
        });
      } else {
        return res.status(502).json({
          success: false,
          error: supabaseResult.error || 'Failed to persist member in Supabase PostgreSQL database',
          supabaseResult
        });
      }
    } catch (err: any) {
      console.error('[API /members POST Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /api/members/:id - Update member in Supabase PostgreSQL
  app.put('/api/members/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const effectiveKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
      if (!SUPABASE_URL || !effectiveKey) {
        return res.status(503).json({ success: false, error: 'Supabase credentials not available' });
      }

      // If status is approved, try calling approve_member RPC
      if (updates.status === 'approved') {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/rpc/approve_member`, {
            method: 'POST',
            headers: {
              'apikey': effectiveKey,
              'Authorization': `Bearer ${effectiveKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              p_member_id: id,
              p_membership_id: updates.membershipId || updates.membership_id || null
            })
          });
        } catch (rpcApproveErr) {}
      }

      // If status is rejected, try calling reject_member RPC
      if (updates.status === 'rejected') {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/rpc/reject_member`, {
            method: 'POST',
            headers: {
              'apikey': effectiveKey,
              'Authorization': `Bearer ${effectiveKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              p_member_id: id,
              p_reason: updates.rejectionReason || updates.rejection_reason || 'Rejected'
            })
          });
        } catch (rpcRejErr) {}
      }

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
      if (updates.passportUrl !== undefined) {
        payload.passport_url = updates.passportUrl;
        payload.passport_photo_url = updates.passportUrl;
      }
      if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;
      if (updates.expiryDate !== undefined) payload.expiry_date = updates.expiryDate;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.state !== undefined) payload.state = updates.state;
      if (updates.lga !== undefined) payload.lga = updates.lga;
      if (updates.address !== undefined) {
        payload.address = updates.address;
        payload.residential_address = updates.address;
      }
      if (updates.residentialAddress !== undefined) {
        payload.residential_address = updates.residentialAddress;
        payload.address = updates.residentialAddress;
      }
      if (updates.specialization !== undefined) payload.specialization = updates.specialization;
      if (updates.qualification !== undefined) payload.qualification = updates.qualification;
      if (updates.highestQualification !== undefined) payload.qualification = updates.highestQualification;
      if (updates.institution !== undefined) payload.company_name = updates.institution;
      if (updates.company !== undefined) payload.company_name = updates.company;
      if (updates.dateOfBirth !== undefined) payload.date_of_birth = updates.dateOfBirth;
      if (updates.dob !== undefined) payload.date_of_birth = updates.dob;
      if (updates.nextOfKin !== undefined) {
        payload.next_of_kin = typeof updates.nextOfKin === 'object' ? JSON.stringify(updates.nextOfKin) : updates.nextOfKin;
        if (updates.nextOfKin?.phone) {
          payload.next_of_kin_phone = String(updates.nextOfKin.phone).trim();
        }
      }

      // If education fields are updated, package qualification_details safely
      if (updates.institution !== undefined || updates.courseOfStudy !== undefined || updates.graduationYear !== undefined || updates.highestQualification !== undefined || updates.qualification !== undefined) {
        const eduObj = {
          institution: updates.institution || updates.company || '',
          courseOfStudy: updates.courseOfStudy || '',
          graduationYear: updates.graduationYear || '',
          highestQualification: updates.highestQualification || updates.qualification || '',
          otherQualifications: updates.otherQualifications || '',
          professionalCertificates: updates.professionalCertificates || ''
        };
        payload.qualification_details = JSON.stringify(eduObj);
      }

      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'apikey': effectiveKey,
          'Authorization': `Bearer ${effectiveKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (patchRes.ok) {
        const updatedRows = await patchRes.json().catch(() => []);
        return res.json({ success: true, member: Array.isArray(updatedRows) && updatedRows[0] ? updatedRows[0] : { id, ...updates } });
      } else {
        const patchErr = await patchRes.text();
        return res.status(patchRes.status).json({ success: false, error: patchErr });
      }
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

      const effectiveKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
      if (!SUPABASE_URL || !effectiveKey) {
        return res.status(503).json({ success: false, error: 'Supabase credentials not available' });
      }

      // Call approve_member RPC
      let rpcSuccess = false;
      try {
        const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/approve_member`, {
          method: 'POST',
          headers: {
            'apikey': effectiveKey,
            'Authorization': `Bearer ${effectiveKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            p_member_id: memberId,
            p_membership_id: membershipId || null
          })
        });
        if (rpcRes.ok) rpcSuccess = true;
      } catch (rpcErr) {}

      // Patch the member directly
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${encodeURIComponent(memberId)}`, {
        method: 'PATCH',
        headers: {
          'apikey': effectiveKey,
          'Authorization': `Bearer ${effectiveKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          status: 'approved',
          membership_id: membershipId || null,
          approved_by: approvedBy || 'Super Admin Secretariat',
          position: position || 'Member',
          issue_date: issueDate || null,
          expiry_date: expiryDate || null,
          updated_at: new Date().toISOString()
        })
      });

      if (patchRes.ok) {
        const updatedRows = await patchRes.json().catch(() => []);
        return res.json({ success: true, member: Array.isArray(updatedRows) && updatedRows[0] ? updatedRows[0] : { id: memberId, status: 'approved', membershipId } });
      } else {
        const patchErr = await patchRes.text();
        return res.status(patchRes.status).json({ success: false, error: patchErr });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/members/:id - Delete a member from Supabase PostgreSQL
  app.delete('/api/members/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const effectiveKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
      if (!SUPABASE_URL || !effectiveKey) {
        return res.status(503).json({ success: false, error: 'Supabase credentials not available' });
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'apikey': effectiveKey,
          'Authorization': `Bearer ${effectiveKey}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ success: false, error: errorText });
      }

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET & POST /api/payments - Payments proxy for Supabase PostgreSQL
  app.get('/api/payments', async (_req, res) => {
    try {
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ success: false, error: 'Supabase credentials not available' });
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/payment_records?select=*&order=date.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ success: false, error: errorText });
      }

      const data = await response.json();
      const payments: any[] = [];
      if (Array.isArray(data)) {
        for (const row of data) {
          if (row && row.id) {
            payments.push({
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

      return res.json({ success: true, count: payments.length, data: payments });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/payments', async (req, res) => {
    try {
      const p = req.body;
      if (!p || !p.id) return res.status(400).json({ success: false, error: 'Payment id is required' });

      const effectiveKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
      if (!SUPABASE_URL || !effectiveKey) {
        return res.status(503).json({ success: false, error: 'Supabase credentials not available' });
      }

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

      const response = await fetch(`${SUPABASE_URL}/rest/v1/payment_records`, {
        method: 'POST',
        headers: {
          'apikey': effectiveKey,
          'Authorization': `Bearer ${effectiveKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ success: false, error: errorText });
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
