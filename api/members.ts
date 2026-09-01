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

  // GET: Fetch all members directly from Supabase PostgreSQL
  if (req.method === 'GET') {
    try {
      if (SUPABASE_URL && SUPABASE_KEY) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/members?select=*&order=registered_at.desc`, {
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

  // POST: Register or save new member to Supabase PostgreSQL
  if (req.method === 'POST') {
    try {
      const member = rawBody;
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

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ success: false, error: 'Supabase credentials not configured on server' });
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/members`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 201 || response.ok) {
        return res.status(201).json({
          success: true,
          message: 'Member registered successfully to Supabase PostgreSQL',
          member
        });
      }

      if (response.status === 409) {
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${encodeURIComponent(payload.id)}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (patchRes.ok) {
          return res.status(200).json({
            success: true,
            message: 'Member updated successfully in Supabase PostgreSQL',
            member
          });
        }
      }

      // Try RPC public_register_member fallback
      try {
        const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_register_member`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ p_payload: payload })
        });
        if (rpcRes.ok) {
          return res.status(201).json({
            success: true,
            message: 'Member registered successfully to Supabase PostgreSQL',
            member
          });
        }
      } catch (rpcErr) {}

      const errorText = await response.text();
      return res.status(response.status || 500).json({ success: false, error: errorText });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // PUT: Update member
  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const updates = req.body;
      const memberId = id || updates.id;

      if (!memberId) return res.status(400).json({ success: false, error: 'Member id is required' });

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

      if (SUPABASE_URL && SUPABASE_KEY) {
        await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${encodeURIComponent(memberId)}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      return res.status(200).json({ success: true, member: { ...updates, id: memberId } });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // DELETE: Delete member
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'Member id is required' });

      if (SUPABASE_URL && SUPABASE_KEY) {
        await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
