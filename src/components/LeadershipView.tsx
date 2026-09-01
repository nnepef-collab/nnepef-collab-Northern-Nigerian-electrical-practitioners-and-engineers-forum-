import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  Mail, 
  Award, 
  ChevronRight, 
  Building2, 
  ShieldCheck, 
  FileText,
  UserCheck
} from 'lucide-react';
import { Executive, ForumSettings } from '../types';
import { NORTHERN_STATES } from '../data/initialData';
import { handleImageError, getValidImageUrl } from '../utils/imageHelpers';

interface LeadershipViewProps {
  executives: Executive[];
  setCurrentView: (view: string) => void;
  settings?: ForumSettings;
}

export const LeadershipView: React.FC<LeadershipViewProps> = ({
  executives,
  setCurrentView,
  settings,
}) => {
  const [selectedTier, setSelectedTier] = useState<'all' | 'national' | 'state' | 'lga'>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLeaderModal, setSelectedLeaderModal] = useState<Executive | null>(null);

  // Filter logic
  const filteredExecutives = executives
    .filter((exec) => {
      // Must be active unless explicitly false
      if (exec.active === false) return false;

      // Tier filter
      if (selectedTier !== 'all' && exec.tier !== selectedTier) return false;

      // State filter
      if (selectedState !== 'all' && exec.state !== selectedState) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = exec.name.toLowerCase().includes(query);
        const matchesPosition = exec.position.toLowerCase().includes(query);
        const matchesState = exec.state?.toLowerCase().includes(query) || false;
        const matchesLga = exec.lga?.toLowerCase().includes(query) || false;
        const matchesBio = exec.bio?.toLowerCase().includes(query) || false;

        return matchesName || matchesPosition || matchesState || matchesLga || matchesBio;
      }

      return true;
    })
    .sort((a, b) => (a.order || 99) - (b.order || 99));

  const nationalCount = executives.filter(e => e.tier === 'national' && e.active !== false).length;
  const stateCount = executives.filter(e => e.tier === 'state' && e.active !== false).length;
  const lgaCount = executives.filter(e => e.tier === 'lga' && e.active !== false).length;

  return (
    <div className="min-h-screen pb-20 space-y-12">
      
      {/* 1. HERO HEADER */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0A2E73] via-[#08245A] to-[#05193C] text-white pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#2EA3F2_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center sm:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#2EA3F2]" />
            <span>N-NEPEF Governance &amp; Official Executive Directory</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                Leadership Directory
              </h1>
              <p className="text-slate-200 text-sm sm:text-base max-w-2xl font-normal leading-relaxed">
                Meet the visionary engineering leaders, state coordinators, and local chapter executives guiding the Northern Nigerian Electrical Practitioners &amp; Engineers Forum across all 19 Northern States.
              </p>
            </div>

            {/* Quick Summary Counter */}
            <div className="lg:col-span-4 flex justify-center lg:justify-end">
              <div className="grid grid-cols-3 gap-3 w-full max-w-md bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center">
                <div className="p-2">
                  <div className="font-display font-extrabold text-2xl text-sky-300">{nationalCount}</div>
                  <div className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">National</div>
                </div>
                <div className="p-2 border-x border-white/10">
                  <div className="font-display font-extrabold text-2xl text-sky-300">{stateCount}</div>
                  <div className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">State</div>
                </div>
                <div className="p-2">
                  <div className="font-display font-extrabold text-2xl text-sky-300">{lgaCount}</div>
                  <div className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">LGA</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FILTER & SEARCH TOOLBAR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card p-6 rounded-3xl space-y-5 border border-slate-200 dark:border-slate-800 shadow-xl">
          
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* Search Bar */}
            <div className="relative w-full lg:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leader name, position, state, LGA..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2EA3F2] outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Tier Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold w-full lg:w-auto">
              {[
                { id: 'all', label: `All Council (${executives.filter(e => e.active !== false).length})` },
                { id: 'national', label: `National Executives (${nationalCount})` },
                { id: 'state', label: `State Executives (${stateCount})` },
                { id: 'lga', label: `LGA Executives (${lgaCount})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTier(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl transition-all flex-1 lg:flex-none text-center ${
                    selectedTier === tab.id
                      ? 'bg-[#0A2E73] text-white shadow dark:bg-[#2EA3F2] dark:text-slate-950 font-extrabold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* State Chapter Dropdown */}
            <div className="w-full lg:w-auto flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 flex-shrink-0">
                <MapPin className="w-3.5 h-3.5 text-[#2EA3F2]" />
                State:
              </span>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full lg:w-48 px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="all">All 19 States</option>
                {NORTHERN_STATES.map((st) => (
                  <option key={st} value={st}>{st} State</option>
                ))}
              </select>
            </div>

          </div>

          {/* Active Filter Chips */}
          {(selectedTier !== 'all' || selectedState !== 'all' || searchQuery) && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">Filtered view:</span>
                {selectedTier !== 'all' && (
                  <span className="px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold uppercase text-[10px]">
                    Tier: {selectedTier}
                  </span>
                )}
                {selectedState !== 'all' && (
                  <span className="px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold uppercase text-[10px]">
                    State: {selectedState}
                  </span>
                )}
                {searchQuery && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                    Query: "{searchQuery}"
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedTier('all');
                  setSelectedState('all');
                  setSearchQuery('');
                }}
                className="font-bold text-[#2EA3F2] hover:underline text-xs"
              >
                Reset Filters
              </button>
            </div>
          )}

        </div>
      </section>

      {/* 3. LEADERSHIP CARDS GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {filteredExecutives.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-3xl space-y-4 border border-slate-200 dark:border-slate-800">
            <Users className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              No Executive Leaders Found
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are currently no active leadership records matching your search or filter options.
            </p>
            <button
              onClick={() => {
                setSelectedTier('all');
                setSelectedState('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-[#0A2E73] text-white text-xs font-bold"
            >
              Reset Filters &amp; View All
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredExecutives.map((exec) => (
              <div
                key={exec.id}
                className="glass-card p-6 rounded-3xl text-center space-y-4 hover:border-[#2EA3F2] transition-all relative flex flex-col justify-between group shadow-md hover:shadow-xl"
              >
                <div className="space-y-4">
                  
                  {/* Top Badge */}
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase">
                    <span className="px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                      {exec.tier === 'national' ? 'National Council' : exec.tier === 'state' ? `${exec.state || ''} State` : `${exec.lga || ''} LGA`}
                    </span>
                    <span className="text-slate-400">
                      {exec.term || '2024 - 2026'}
                    </span>
                  </div>

                  {/* Passport Photo */}
                  <div className="relative w-28 h-28 mx-auto">
                    <img
                      src={getValidImageUrl(exec.photoUrl, 'avatar')}
                      alt={exec.name}
                      onError={(e) => handleImageError(e, 'avatar')}
                      className="w-full h-full rounded-3xl object-cover border-4 border-[#0A2E73] dark:border-[#2EA3F2] shadow-lg group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute -bottom-2 -right-2 p-1.5 bg-emerald-500 text-white rounded-full border-2 border-white dark:border-slate-900 shadow">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Leader Info */}
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-white line-clamp-1">
                      {exec.name}
                    </h3>
                    <p className="text-xs font-extrabold text-[#2EA3F2] line-clamp-1">
                      {exec.position}
                    </p>
                    
                    {/* Location detail */}
                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      <span>
                        {exec.tier === 'national' 
                          ? 'National Headquarters' 
                          : exec.tier === 'state' 
                          ? `${exec.state} State Chapter` 
                          : `${exec.lga} LGA, ${exec.state} State`}
                      </span>
                    </div>
                  </div>

                  {/* Bio snippet */}
                  {exec.bio && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed text-left bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      {exec.bio}
                    </p>
                  )}

                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  {exec.phone && (
                    <div className="flex items-center justify-center gap-1 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                      <Phone className="w-3.5 h-3.5 text-[#2EA3F2]" />
                      <a href={`tel:${exec.phone}`} className="hover:underline">{exec.phone}</a>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedLeaderModal(exec)}
                    className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#0A2E73] hover:text-white dark:hover:bg-[#2EA3F2] dark:hover:text-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <span>View Full Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. LEADER FULL PROFILE MODAL */}
      {selectedLeaderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl p-6 sm:p-8 rounded-3xl space-y-6 max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-4">
                <img
                  src={getValidImageUrl(selectedLeaderModal.photoUrl, 'avatar')}
                  alt={selectedLeaderModal.name}
                  onError={(e) => handleImageError(e, 'avatar')}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#0A2E73] shadow-md"
                />
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                    {selectedLeaderModal.tier === 'national' ? 'National Executive' : selectedLeaderModal.tier === 'state' ? `${selectedLeaderModal.state} State Executive` : `${selectedLeaderModal.lga} LGA Executive`}
                  </span>
                  <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white mt-1">
                    {selectedLeaderModal.name}
                  </h3>
                  <p className="text-sm font-extrabold text-[#2EA3F2]">
                    {selectedLeaderModal.position}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeaderModal(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">State Chapter</span>
                <p className="font-bold text-slate-900 dark:text-white">{selectedLeaderModal.state || 'National'}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Local Government (LGA)</span>
                <p className="font-bold text-slate-900 dark:text-white">{selectedLeaderModal.lga || 'N/A'}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tenure / Term</span>
                <p className="font-bold text-slate-900 dark:text-white">{selectedLeaderModal.term || '2024 - 2026'}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Official Contact Phone</span>
                <p className="font-bold text-slate-900 dark:text-white">{selectedLeaderModal.phone || 'Contact via Secretariat'}</p>
              </div>
            </div>

            {/* Leader Bio */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Biography &amp; Professional Credentials
              </h4>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {selectedLeaderModal.bio || 'Official biography details filed with N-NEPEF Secretariat.'}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500 font-medium">N-NEPEF 2020 Verified Executive</span>
              <button
                onClick={() => setSelectedLeaderModal(null)}
                className="px-5 py-2 rounded-xl bg-[#0A2E73] text-white font-bold"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
