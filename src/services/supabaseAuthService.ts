/**
 * N-NEPEF 2020 DIGITAL PORTAL - SUPABASE AUTHENTICATION SERVICE
 * 
 * Manages Supabase Auth lifecycle:
 * - Email & Password Sign-up
 * - Email & Password Sign-in
 * - Session restoration & token auto-refresh
 * - Password Reset flows
 * - Integration with Member profile
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Member, AdminAccount } from '../types';
import { fetchMembersFromSupabase, saveMemberToSupabase } from './supabaseService';

export interface AuthResponse {
  success: boolean;
  user?: Member | null;
  admin?: AdminAccount | null;
  role?: string;
  error?: string;
  session?: any;
}

/**
 * Sign in using Supabase Auth (or offline fallback)
 */
export async function signInUser(identifier: string, password: string): Promise<AuthResponse> {
  const cleanInput = identifier.trim().toLowerCase();

  // 1. If Supabase is configured and input is an email, attempt Supabase Auth
  if (isSupabaseConfigured()) {
    try {
      let emailToUse = cleanInput;

      // If user typed a Membership ID or Phone instead of email, look up member record first
      if (!cleanInput.includes('@')) {
        const { data: memberLookup } = await supabase
          .from('members')
          .select('email')
          .or(`membership_id.ilike.${cleanInput},phone.eq.${cleanInput}`)
          .single();

        if (memberLookup && memberLookup.email) {
          emailToUse = memberLookup.email.trim().toLowerCase();
        }
      }

      if (emailToUse.includes('@')) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password
        });

        if (!error && data.user) {
          // Fetch corresponding member profile
          const { data: profile } = await supabase
            .from('members')
            .select('*')
            .or(`id.eq.${data.user.id},email.eq.${emailToUse}`)
            .single();

          if (profile) {
            const memberObj: Member = {
              id: profile.id,
              membershipId: profile.membership_id || '',
              fullName: profile.full_name,
              gender: profile.gender || 'Male',
              dob: profile.dob || profile.date_of_birth || '',
              dateOfBirth: profile.date_of_birth || profile.dob || '',
              phone: profile.phone || '',
              email: profile.email || emailToUse,
              nin: profile.nin || profile.nin_number || '',
              ninNumber: profile.nin_number || profile.nin || '',
              state: profile.state,
              lga: profile.lga,
              address: profile.address || profile.residential_address || '',
              residentialAddress: profile.residential_address || profile.address || '',
              occupation: profile.occupation || '',
              specialization: profile.specialization || '',
              yearsOfExperience: profile.years_of_experience || 0,
              company: profile.company || '',
              passportUrl: profile.passport_url || profile.passport_photo_url || '',
              paymentReceiptUrl: profile.payment_receipt_url || '',
              status: profile.status,
              role: profile.role || 'Member',
              position: profile.position || 'Member',
              registeredAt: profile.registered_at || new Date().toISOString(),
              approvedAt: profile.approved_at
            };

            const isSuspended = (profile.status || '').toLowerCase() === 'suspended' || (profile.status || '').toLowerCase() === 'inactive';
            
            const isAdminRole = 
              profile.role === 'Admin' || 
              profile.role === 'Super Admin' || 
              profile.role === 'super_admin' || 
              profile.role === 'admin' ||
              profile.role === 'national_admin' ||
              profile.role === 'state_admin' ||
              profile.role === 'lga_admin' ||
              profile.role === 'treasurer' ||
              profile.role === 'secretary' ||
              data.user.app_metadata?.role === 'admin' ||
              data.user.app_metadata?.role === 'super_admin' ||
              data.user.user_metadata?.role === 'admin' ||
              data.user.user_metadata?.role === 'super_admin' ||
              emailToUse === 'ahmadhussainiali2020@gmail.com';

            const isAdmin = isAdminRole && !isSuspended;
            const effectiveRole = isAdminRole ? (profile.role || 'Super Admin') : (profile.role || 'Member');

            if (isSuspended) {
              return {
                success: false,
                error: 'Your account is currently suspended or inactive. Please contact the Secretariat IT Unit.'
              };
            }

            return {
              success: true,
              user: memberObj,
              admin: isAdmin ? {
                id: profile.id,
                username: profile.email || emailToUse,
                fullName: emailToUse === 'ahmadhussainiali2020@gmail.com' ? 'Hussaini Ahmad Ali' : profile.full_name,
                email: profile.email || emailToUse,
                phone: profile.phone || '',
                role: (effectiveRole as any) || 'Super Admin',
                permissions: ['ALL_PERMISSIONS'],
                status: 'active',
                createdAt: profile.registered_at || new Date().toISOString()
              } : null,
              role: effectiveRole,
              session: data.session
            };
          } else {
            // Check admin_profiles and admin_accounts tables in Supabase
            let adminRecord: any = null;
            try {
              const { data: prof } = await supabase
                .from('admin_profiles')
                .select('*')
                .or(`id.eq.${data.user.id},email.eq.${emailToUse}`)
                .maybeSingle();
              if (prof) adminRecord = prof;
            } catch (e) {}

            if (!adminRecord) {
              try {
                const { data: acc } = await supabase
                  .from('admin_accounts')
                  .select('*')
                  .or(`id.eq.${data.user.id},email.eq.${emailToUse}`)
                  .maybeSingle();
                if (acc) adminRecord = acc;
              } catch (e) {}
            }

            if (adminRecord) {
              const isAdminSuspended = (adminRecord.status || '').toLowerCase() === 'suspended' || (adminRecord.status || '').toLowerCase() === 'inactive';
              if (isAdminSuspended) {
                return {
                  success: false,
                  error: 'Administrator account is suspended or inactive. Please contact Super Admin.'
                };
              }

              return {
                success: true,
                admin: {
                  id: adminRecord.id || data.user.id,
                  username: adminRecord.username || adminRecord.email || emailToUse,
                  fullName: adminRecord.full_name || (emailToUse === 'ahmadhussainiali2020@gmail.com' ? 'Hussaini Ahmad Ali' : 'System Administrator'),
                  email: adminRecord.email || emailToUse,
                  phone: adminRecord.phone || '',
                  role: adminRecord.role || 'super_admin',
                  permissions: adminRecord.permissions || ['all'],
                  status: adminRecord.status || 'active',
                  createdAt: adminRecord.created_at || new Date().toISOString()
                },
                role: adminRecord.role === 'super_admin' ? 'Super Admin' : (adminRecord.role || 'Super Admin'),
                session: data.session
              };
            }

            // User exists in auth.users with admin metadata or authorized email
            const isUserAdmin = 
              data.user.app_metadata?.role === 'admin' ||
              data.user.app_metadata?.role === 'super_admin' ||
              data.user.user_metadata?.role === 'admin' ||
              data.user.user_metadata?.role === 'super_admin' ||
              emailToUse === 'ahmadhussainiali2020@gmail.com';

            return {
              success: true,
              admin: isUserAdmin ? {
                id: data.user.id,
                fullName: emailToUse === 'ahmadhussainiali2020@gmail.com' ? 'Hussaini Ahmad Ali' : (data.user.user_metadata?.full_name || 'System Administrator'),
                email: data.user.email || emailToUse,
                username: emailToUse.split('@')[0],
                phone: '',
                role: 'super_admin',
                status: 'active',
                permissions: ['all'],
                createdAt: data.user.created_at || new Date().toISOString()
              } : null,
              role: isUserAdmin ? 'Super Admin' : 'Member',
              session: data.session
            };
          }
        }
      }
    } catch (err: any) {
      console.warn('[Supabase Auth] Cloud sign-in attempt warning:', err?.message || err);
    }
  }

  // 2. Direct Supabase Admin Accounts Table Query
  if (isSupabaseConfigured()) {
    try {
      const { data: adminMatch } = await supabase
        .from('admin_accounts')
        .select('*')
        .or(`email.ilike.${cleanInput},username.ilike.${cleanInput}`)
        .maybeSingle();

      if (adminMatch) {
        const isSuspended = (adminMatch.status || '').toLowerCase() === 'suspended' || (adminMatch.status || '').toLowerCase() === 'inactive';
        if (isSuspended) {
          return {
            success: false,
            error: 'Administrator account is suspended or inactive. Please contact Super Admin.'
          };
        }

        return {
          success: true,
          admin: {
            id: adminMatch.id,
            username: adminMatch.username || adminMatch.email,
            fullName: adminMatch.full_name || 'System Administrator',
            email: adminMatch.email,
            phone: adminMatch.phone || '',
            role: adminMatch.role || 'super_admin',
            permissions: adminMatch.permissions || ['all'],
            status: adminMatch.status || 'active',
            createdAt: adminMatch.created_at || new Date().toISOString()
          },
          role: adminMatch.role === 'super_admin' ? 'Super Admin' : (adminMatch.role || 'Super Admin')
        };
      }
    } catch (adminErr) {
      console.warn('[Supabase Admin Query Note]:', adminErr);
    }
  }

  // 3. Super Admin Fallback for Hussaini Ahmad Ali
  if (cleanInput === 'ahmadhussainiali2020@gmail.com') {
    if (password && password.length >= 4) {
      const superAdmin: AdminAccount = {
        id: 'adm-super-root',
        fullName: 'Hussaini Ahmad Ali',
        email: 'ahmadhussainiali2020@gmail.com',
        username: 'ahmadhussainiali2020',
        phone: '',
        role: 'super_admin',
        status: 'active',
        permissions: ['all'],
        lastLogin: new Date().toISOString(),
        createdAt: '2020-01-01'
      };
      return {
        success: true,
        admin: superAdmin,
        role: 'Super Admin'
      };
    }
  }

  // 3. Member Local Lookup
  const allMembers = await fetchMembersFromSupabase();
  const foundMember = allMembers.find(m => 
    (m.email && m.email.toLowerCase() === cleanInput) ||
    (m.membershipId && m.membershipId.toLowerCase() === cleanInput) ||
    (m.phone && m.phone.replace(/[\s\-\+]/g, '') === identifier.replace(/[\s\-\+]/g, ''))
  );

  if (foundMember) {
    return {
      success: true,
      user: foundMember,
      role: foundMember.role || 'Member'
    };
  }

  return {
    success: false,
    error: 'Account not found. Please check your Membership ID, Email or Phone.'
  };
}

/**
 * Sign up a new member in Supabase Auth and link profile
 */
export async function signUpMember(member: Member, password?: string): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured() && member.email && password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: member.email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: member.fullName,
            state: member.state,
            lga: member.lga,
            phone: member.phone
          }
        }
      });

      if (error) {
        console.warn('[Supabase Auth] Sign up error:', error.message);
      } else if (data.user) {
        // Link user_id to member record
        const memberWithUser: Member = {
          ...member,
          id: data.user.id
        };
        await saveMemberToSupabase(memberWithUser);
        return { success: true };
      }
    } catch (e: any) {
      console.warn('[Supabase Auth] Sign up network error:', e);
    }
  }

  // Fallback direct member save
  await saveMemberToSupabase(member);
  return { success: true };
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
  }
}

/**
 * Password Reset
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; message: string }> {
  if (isSupabaseConfigured() && email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin
      });

      if (!error) {
        return {
          success: true,
          message: 'Password reset link has been sent to your email address from Supabase.'
        };
      }
    } catch (e) {}
  }

  return {
    success: true,
    message: 'If an account exists with this email, password recovery instructions have been sent.'
  };
}

/**
 * Restore existing session from Supabase Auth
 */
export async function restoreSupabaseSession(): Promise<AuthResponse | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData.session?.user) return null;

    const user = sessionData.session.user;
    const userEmail = (user.email || '').trim().toLowerCase();

    // Check members table
    const { data: profile } = await supabase
      .from('members')
      .select('*')
      .or(`id.eq.${user.id},email.eq.${userEmail}`)
      .single();

    if (profile) {
      const memberObj: Member = {
        id: profile.id,
        membershipId: profile.membership_id || '',
        fullName: profile.full_name,
        gender: profile.gender || 'Male',
        dob: profile.dob || profile.date_of_birth || '',
        dateOfBirth: profile.date_of_birth || profile.dob || '',
        phone: profile.phone || '',
        email: profile.email || userEmail,
        nin: profile.nin || profile.nin_number || '',
        ninNumber: profile.nin_number || profile.nin || '',
        state: profile.state,
        lga: profile.lga,
        address: profile.address || profile.residential_address || '',
        residentialAddress: profile.residential_address || profile.address || '',
        occupation: profile.occupation || '',
        specialization: profile.specialization || '',
        yearsOfExperience: profile.years_of_experience || 0,
        company: profile.company || '',
        passportUrl: profile.passport_url || profile.passport_photo_url || '',
        paymentReceiptUrl: profile.payment_receipt_url || '',
        status: profile.status,
        role: profile.role || 'Member',
        position: profile.position || 'Member',
        registeredAt: profile.registered_at || new Date().toISOString(),
        approvedAt: profile.approved_at
      };

      const isSuspended = (profile.status || '').toLowerCase() === 'suspended' || (profile.status || '').toLowerCase() === 'inactive';

      const isAdminRole = 
        profile.role === 'Admin' || 
        profile.role === 'Super Admin' || 
        profile.role === 'super_admin' || 
        profile.role === 'admin' ||
        profile.role === 'national_admin' ||
        profile.role === 'state_admin' ||
        profile.role === 'lga_admin' ||
        profile.role === 'treasurer' ||
        profile.role === 'secretary' ||
        user.app_metadata?.role === 'admin' ||
        user.app_metadata?.role === 'super_admin' ||
        user.user_metadata?.role === 'admin' ||
        user.user_metadata?.role === 'super_admin' ||
        userEmail === 'ahmadhussainiali2020@gmail.com';

      const isAdmin = isAdminRole && !isSuspended;

      if (isSuspended) {
        return null;
      }

      return {
        success: true,
        user: memberObj,
        admin: isAdmin ? {
          id: profile.id,
          username: profile.email || userEmail,
          fullName: userEmail === 'ahmadhussainiali2020@gmail.com' ? 'Hussaini Ahmad Ali' : profile.full_name,
          email: profile.email || userEmail,
          phone: profile.phone || '',
          role: (profile.role as any) || 'Super Admin',
          permissions: ['ALL_PERMISSIONS'],
          status: 'active',
          createdAt: profile.registered_at || new Date().toISOString()
        } : null,
        role: isAdmin ? 'Super Admin' : (profile.role || 'Member'),
        session: sessionData.session
      };
    }

    // Check admin_profiles and admin_accounts
    let adminRecord: any = null;
    try {
      const { data: prof } = await supabase
        .from('admin_profiles')
        .select('*')
        .or(`id.eq.${user.id},email.eq.${userEmail}`)
        .maybeSingle();
      if (prof) adminRecord = prof;
    } catch (e) {}

    if (!adminRecord) {
      try {
        const { data: acc } = await supabase
          .from('admin_accounts')
          .select('*')
          .or(`id.eq.${user.id},email.eq.${userEmail}`)
          .maybeSingle();
        if (acc) adminRecord = acc;
      } catch (e) {}
    }

    if (adminRecord) {
      const isAdminSuspended = (adminRecord.status || '').toLowerCase() === 'suspended' || (adminRecord.status || '').toLowerCase() === 'inactive';
      if (isAdminSuspended) {
        return null;
      }

      return {
        success: true,
        admin: {
          id: adminRecord.id || user.id,
          username: adminRecord.username || adminRecord.email || userEmail,
          fullName: adminRecord.full_name || (userEmail === 'ahmadhussainiali2020@gmail.com' ? 'Hussaini Ahmad Ali' : 'System Administrator'),
          email: adminRecord.email || userEmail,
          phone: adminRecord.phone || '',
          role: adminRecord.role || 'super_admin',
          permissions: adminRecord.permissions || ['all'],
          status: adminRecord.status || 'active',
          createdAt: adminRecord.created_at || new Date().toISOString()
        },
        role: adminRecord.role === 'super_admin' ? 'Super Admin' : (adminRecord.role || 'Super Admin'),
        session: sessionData.session
      };
    }

    const isUserAdmin = 
      user.app_metadata?.role === 'admin' ||
      user.app_metadata?.role === 'super_admin' ||
      user.user_metadata?.role === 'admin' ||
      user.user_metadata?.role === 'super_admin' ||
      userEmail === 'ahmadhussainiali2020@gmail.com';

    return {
      success: true,
      admin: isUserAdmin ? {
        id: user.id,
        fullName: userEmail === 'ahmadhussainiali2020@gmail.com' ? 'Hussaini Ahmad Ali' : (user.user_metadata?.full_name || 'System Administrator'),
        email: userEmail,
        username: userEmail.split('@')[0],
        phone: '',
        role: 'super_admin',
        status: 'active',
        permissions: ['all'],
        lastLogin: new Date().toISOString(),
        createdAt: user.created_at || '2020-01-01'
      } : null,
      role: isUserAdmin ? 'Super Admin' : 'Member',
      session: sessionData.session
    };
  } catch (e) {
    return null;
  }
}

/**
 * Subscribe to Supabase auth state changes
 */
export function subscribeToAuthState(callback: (event: string, session: any) => void) {
  if (!isSupabaseConfigured()) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => {
    subscription.unsubscribe();
  };
}

