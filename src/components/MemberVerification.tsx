import React, { useState, useEffect } from 'react';
import { Member } from '../types';
import { ShieldCheck, Search, AlertCircle, CheckCircle2, Lock, ArrowLeft, Award, MapPin, Building2, User } from 'lucide-react';
import { handleImageError, getValidImageUrl } from '../utils/imageHelpers';
import { verifyMemberBySearch } from '../services/supabaseService';

interface MemberVerificationProps {
  members: Member[];
  setCurrentView: (view: string) => void;
}

export const MemberVerification: React.FC<MemberVerificationProps> = ({ members, setCurrentView }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [remoteResults, setRemoteResults] = useState<Partial<Member>[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Filter ONLY Approved Members for Public Verification from local state
  const approvedMembers = members.filter(m => m.status === 'approved' || m.status === 'Active');

  const localResults = searchQuery.trim() === ''
    ? []
    : approvedMembers.filter(m => 
        m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.membershipId && m.membershipId.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  const searchResults = remoteResults !== null ? remoteResults : localResults;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setHasSearched(true);
      setIsSearching(true);
      try {
        const cloudMatches = await verifyMemberBySearch(searchQuery);
        if (cloudMatches && cloudMatches.length > 0) {
          setRemoteResults(cloudMatches);
        } else {
          setRemoteResults(localResults);
        }
      } catch (err) {
        setRemoteResults(localResults);
      } finally {
        setIsSearching(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#0A2E73] dark:hover:text-sky-400"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
        <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <Lock className="w-3 h-3" />
          <span>Public Verified Database</span>
        </span>
      </div>

      {/* Header Box */}
      <div className="glass-card p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 bg-sky-100 dark:bg-sky-950 rounded-2xl flex items-center justify-center text-[#0A2E73] dark:text-[#2EA3F2] mx-auto">
          <ShieldCheck className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            Official Member Verification
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
            Search for certified electrical engineers and practitioners in Northern Nigeria by entering their <strong>Membership ID Number</strong> or <strong>Full Name</strong>.
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto pt-2">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-4" />
            <input
              type="text"
              required
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHasSearched(false);
              }}
              placeholder="Enter Membership ID Number or Full Name..."
              className="w-full pl-12 pr-28 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:border-[#2EA3F2] outline-none shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-2 px-5 py-2 rounded-xl bg-[#0A2E73] text-white text-xs font-bold hover:bg-sky-700 transition-colors shadow"
            >
              Verify
            </button>
          </div>
        </form>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1 pt-1">
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span>Strict Privacy Enforced: Phone numbers, emails, addresses, NIN, DOB &amp; payment receipts are private and hidden.</span>
        </p>
      </div>

      {/* SEARCH RESULTS DISPLAY */}
      {hasSearched || searchQuery.trim() !== '' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Verification Results ({searchResults.length} Match Found)
            </h3>
            <span className="text-xs text-slate-500">Only Official Approved Members Displayed</span>
          </div>

          {searchResults.length === 0 ? (
            <div className="p-8 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <h4 className="font-bold text-lg text-red-800 dark:text-red-300">This member cannot be verified.</h4>
              <p className="text-xs text-red-700 dark:text-red-300 max-w-md mx-auto">
                No active approved member record matching "<strong>{searchQuery}</strong>" was found in the official N-NEPEF database. Unapproved, pending, or non-existent members cannot be verified.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {searchResults.map((member) => (
                <div 
                  key={member.id}
                  className="glass-card p-6 rounded-3xl border-2 border-emerald-500/40 dark:border-emerald-500/50 relative overflow-hidden space-y-4 shadow-xl"
                >
                  {/* Status Ribbon */}
                  <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider shadow">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>VERIFIED ACTIVE</span>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <img 
                      src={getValidImageUrl(member.passportUrl, 'avatar')} 
                      alt={member.fullName} 
                      onError={(e) => handleImageError(e, 'avatar')}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-[#0A2E73] dark:border-sky-400 shadow-md flex-shrink-0"
                    />
                    <div className="space-y-1">
                      <h4 className="font-display font-extrabold text-lg text-slate-900 dark:text-white leading-tight">
                        {member.fullName}
                      </h4>
                      <div className="font-mono text-xs font-extrabold text-[#2EA3F2] bg-sky-50 dark:bg-sky-950 px-2.5 py-1 rounded-lg inline-block border border-sky-200 dark:border-sky-800">
                        {member.membershipId}
                      </div>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {member.position || 'Practicing Member'}
                      </p>
                    </div>
                  </div>

                  {/* Public Verification Attributes Grid (EXCLUSIVELY ALLOWED FIELDS) */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl space-y-2 text-xs border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-[#2EA3F2]" />
                        Specialization:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-right max-w-[200px] truncate">
                        {member.specialization}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#2EA3F2]" />
                        State Chapter:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {member.state} State
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#2EA3F2]" />
                        Membership Status:
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        VERIFIED ACTIVE
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#2EA3F2]" />
                        Organization Name:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-right">
                        N-NEPEF 2020
                      </span>
                    </div>
                  </div>

                  {/* Banner Statement */}
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 text-center font-bold">
                    Verified Official Member of Northern Nigerian Electrical Practitioners &amp; Engineers Forum (N-NEPEF 2020).
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Please enter a <strong>Membership ID Number</strong> (e.g. NEPEF/2020/KN/001) or <strong>Full Name</strong> above to perform an official verification check.
          </p>
        </div>
      )}

    </div>
  );
};

