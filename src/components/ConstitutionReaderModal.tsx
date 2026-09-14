import React, { useState } from 'react';
import { OFFICIAL_CONSTITUTION_DATA, ConstitutionArticle } from '../data/constitutionData';
import { DocumentItem } from '../types';
import { BookOpen, Download, Lock, Search, X, CheckCircle, Shield, Globe, Printer, ChevronRight } from 'lucide-react';

interface ConstitutionReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  constitutionDoc?: DocumentItem;
}

export const ConstitutionReaderModal: React.FC<ConstitutionReaderModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false,
  constitutionDoc
}) => {
  const [activeArticleId, setActiveArticleId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [languageMode, setLanguageMode] = useState<'both' | 'english' | 'hausa'>('both');
  const [showAdminNotice, setShowAdminNotice] = useState(false);

  if (!isOpen) return null;

  const data = OFFICIAL_CONSTITUTION_DATA;
  const downloadUrl = constitutionDoc?.fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  const docTitle = constitutionDoc?.title || data.title;

  const filteredArticles = data.articles.filter((art) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const matchArticle = art.title.toLowerCase().includes(query) || (art.hausaTitle && art.hausaTitle.toLowerCase().includes(query));
    const matchSections = art.sections.some(s => 
      s.heading.toLowerCase().includes(query) || 
      s.content.toLowerCase().includes(query) || 
      (s.hausaSummary && s.hausaSummary.toLowerCase().includes(query))
    );
    return matchArticle || matchSections;
  });

  const handleDownloadClick = (e: React.MouseEvent) => {
    if (!isAdmin) {
      e.preventDefault();
      setShowAdminNotice(true);
      setTimeout(() => setShowAdminNotice(false), 5000);
      return;
    }

    // For Admin: Trigger download
    try {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `N-NEPEF_Official_Constitution_${new Date().getFullYear()}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      window.open(downloadUrl, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Top Header Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-100 dark:bg-sky-950 rounded-2xl text-[#0A2E73] dark:text-[#2EA3F2]">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  Kundin Tsarin Mulki (N-NEPEF 2020 Constitution)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  Official Secretariat Document
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {data.edition} • Effective: {data.effectiveDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors hidden sm:flex items-center gap-1.5 text-xs font-bold"
              title="Print Reader"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            {/* DOWNLOAD BUTTON: ADMIN ONLY VS RESTRICTED */}
            {isAdmin ? (
              <button
                onClick={handleDownloadClick}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
                title="Super Admin Authorized PDF Download"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF (Admin)</span>
              </button>
            ) : (
              <button
                onClick={handleDownloadClick}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 hover:border-amber-500 transition-all group"
                title="Download is restricted to Secretariat Administrators"
              >
                <Lock className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Karantawa Kawai (Admin Ke Saukewa)</span>
                <span className="sm:hidden">Admin Only</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Admin Only Notice Banner for Non-Admins */}
        {showAdminNotice && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/80 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-semibold px-6">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Saukewa ta Admin Ne Kadai:</strong> Kundin Tsarin Mulki kyauta ne ga kowa ya duba ya karanta online a wannan shafi. Saukar da asalin fayil din PDF an kebe shi ga Babban Admin na Sakatariya kadai.
              </span>
            </div>
            <button onClick={() => setShowAdminNotice(false)} className="text-amber-600 hover:text-amber-900 ml-3">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter & Language Control Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Bincika a cikin Kundin Tsarin Mulki (Search)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              <span>Yare / Language:</span>
            </span>
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                onClick={() => setLanguageMode('both')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  languageMode === 'both' ? 'bg-white dark:bg-slate-700 text-[#0A2E73] dark:text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Duka Biyu (Both)
              </button>
              <button
                onClick={() => setLanguageMode('english')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  languageMode === 'english' ? 'bg-white dark:bg-slate-700 text-[#0A2E73] dark:text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguageMode('hausa')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  languageMode === 'hausa' ? 'bg-white dark:bg-slate-700 text-[#0A2E73] dark:text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Hausa
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area with Chapter Sidebar + Reading Pane */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Chapters Sidebar Navigation */}
          <div className="w-full md:w-72 border-r border-slate-200 dark:border-slate-800 p-3 overflow-y-auto max-h-48 md:max-h-full bg-slate-50/50 dark:bg-slate-950/30 space-y-1 shrink-0">
            <button
              onClick={() => setActiveArticleId('all')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                activeArticleId === 'all'
                  ? 'bg-[#0A2E73] text-white dark:bg-[#2EA3F2] dark:text-slate-950 shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span>Dukkan Sashe (Full Constitution)</span>
              <span className="text-[10px] opacity-75">7 Articles</span>
            </button>

            <button
              onClick={() => setActiveArticleId('preamble')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeArticleId === 'preamble'
                  ? 'bg-sky-100 text-[#0A2E73] dark:bg-sky-950 dark:text-sky-300 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>Preamble (Gabatarwa)</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            {data.articles.map((art) => (
              <button
                key={art.id}
                onClick={() => setActiveArticleId(art.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                  activeArticleId === art.id
                    ? 'bg-sky-100 text-[#0A2E73] dark:bg-sky-950 dark:text-sky-300 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400">{art.articleNumber}</div>
                  <div className="truncate text-slate-800 dark:text-slate-200">{art.title}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-40" />
              </button>
            ))}
          </div>

          {/* Reading Pane */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-8 bg-white dark:bg-slate-900">
            
            {/* Document Title & Preamble Banner */}
            {(activeArticleId === 'all' || activeArticleId === 'preamble') && (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-800/80 dark:to-slate-900 border border-sky-100 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                  <Shield className="w-4 h-4" />
                  <span>The Supreme Charter of N-NEPEF 2020</span>
                </div>
                <h1 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white leading-tight">
                  {docTitle}
                </h1>
                
                {/* Preamble Content */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-sm text-[#0A2E73] dark:text-[#2EA3F2] uppercase tracking-wide">
                    Preamble / Gabatarwa
                  </h3>
                  
                  {(languageMode === 'both' || languageMode === 'english') && (
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-serif italic bg-white/70 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                      "{data.preamble}"
                    </p>
                  )}

                  {(languageMode === 'both' || languageMode === 'hausa') && (
                    <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed font-serif italic bg-emerald-50/70 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/50">
                      <strong>Hausa:</strong> "{data.hausaPreamble}"
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Articles List */}
            <div className="space-y-8">
              {filteredArticles
                .filter(art => activeArticleId === 'all' || activeArticleId === art.id)
                .map((art) => (
                  <article key={art.id} className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-8 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-[#0A2E73] text-white dark:bg-[#2EA3F2] dark:text-slate-950 font-mono font-bold text-xs">
                        {art.articleNumber}
                      </span>
                      <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
                        {art.title}
                      </h3>
                    </div>

                    {art.hausaTitle && (languageMode === 'both' || languageMode === 'hausa') && (
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {art.hausaTitle}
                      </p>
                    )}

                    {/* Sections within Article */}
                    <div className="space-y-4 pt-2">
                      {art.sections.map((sec, sIdx) => (
                        <div key={sIdx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 font-mono">
                              {sec.sectionNumber}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              {sec.heading}
                            </h4>
                          </div>

                          {(languageMode === 'both' || languageMode === 'english') && (
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              {sec.content}
                            </p>
                          )}

                          {sec.hausaSummary && (languageMode === 'both' || languageMode === 'hausa') && (
                            <div className="pt-2 mt-2 border-t border-slate-200/80 dark:border-slate-700/60 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                              <span className="font-bold">Fassara / Hausa: </span>
                              <span>{sec.hausaSummary}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
            </div>

            {/* Constitution Footer Note */}
            <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Certified authentic copy. Enacted and published by the N-NEPEF Secretariat.</span>
              </div>
              <div className="text-[11px] font-bold text-slate-500">
                {isAdmin ? 'Super Admin Mode: Full Download Enabled' : 'Public Mode: Online Reading Only'}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
