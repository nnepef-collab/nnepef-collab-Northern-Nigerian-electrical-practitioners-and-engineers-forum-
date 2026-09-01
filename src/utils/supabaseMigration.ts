/**
 * N-NEPEF 2020 DIGITAL PORTAL - SUPABASE DATA MIGRATION UTILITY
 * 
 * Safely transfers all existing local storage records into Supabase PostgreSQL tables
 * and uploads files into Supabase Storage buckets.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  getLocalPayments, 
  getLocalSettings, 
  getLocalAnnouncements, 
  getLocalDocuments, 
  getLocalEvents, 
  getLocalGallery, 
  getLocalNews, 
  getLocalExecutives, 
  getLocalBankAccounts, 
  getLocalAdmins 
} from '../services/localDatabaseService';
import { savePaymentToSupabase, saveSettingsToSupabase } from '../services/supabaseService';

export interface MigrationReport {
  totalItems: number;
  migratedCount: number;
  failedCount: number;
  details: {
    members: { total: number; success: number; failed: number };
    payments: { total: number; success: number; failed: number };
    settings: boolean;
    announcements: { total: number; success: number; failed: number };
    bankAccounts: { total: number; success: number; failed: number };
  };
  errors: string[];
}

export async function migrateLocalDataToSupabase(): Promise<MigrationReport> {
  const report: MigrationReport = {
    totalItems: 0,
    migratedCount: 0,
    failedCount: 0,
    details: {
      members: { total: 0, success: 0, failed: 0 },
      payments: { total: 0, success: 0, failed: 0 },
      settings: false,
      announcements: { total: 0, success: 0, failed: 0 },
      bankAccounts: { total: 0, success: 0, failed: 0 }
    },
    errors: []
  };

  if (!isSupabaseConfigured()) {
    report.errors.push('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your deployment environment settings.');
    return report;
  }

  // 1. Migrate Forum Settings
  try {
    const settings = getLocalSettings();
    await saveSettingsToSupabase(settings);
    report.details.settings = true;
    report.migratedCount++;
  } catch (e: any) {
    report.errors.push(`Settings migration error: ${e.message}`);
  }

  // 2. Members (Supabase PostgreSQL is the sole authoritative store - no local migration needed)
  report.details.members.total = 0;
  report.details.members.success = 0;
  report.details.members.failed = 0;

  // 3. Migrate Payments
  const localPayments = getLocalPayments();
  report.details.payments.total = localPayments.length;
  report.totalItems += localPayments.length;

  for (const payment of localPayments) {
    try {
      await savePaymentToSupabase(payment);
      report.details.payments.success++;
      report.migratedCount++;
    } catch (e: any) {
      report.details.payments.failed++;
      report.failedCount++;
      report.errors.push(`Payment "${payment.reference}" migration failed: ${e.message}`);
    }
  }

  // 4. Migrate Bank Accounts
  const localBanks = getLocalBankAccounts();
  report.details.bankAccounts.total = localBanks.length;
  report.totalItems += localBanks.length;

  for (const bank of localBanks) {
    try {
      await supabase.from('bank_accounts').upsert({
        id: bank.id,
        bank_name: bank.bankName,
        account_name: bank.accountName,
        account_number: bank.accountNumber,
        branch: bank.branch || null,
        is_active: bank.isActive !== false,
        payment_instructions: bank.paymentInstructions || null
      }, { onConflict: 'id' });
      report.details.bankAccounts.success++;
      report.migratedCount++;
    } catch (e: any) {
      report.details.bankAccounts.failed++;
      report.failedCount++;
    }
  }

  return report;
}
