import React, { useState } from 'react';
import { DocumentItem } from '../types';
import { FolderDown, Download, FileText, ArrowLeft, Search, BookOpen, Lock, Eye, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ConstitutionReaderModal } from './ConstitutionReaderModal';

interface DocumentsViewProps {
  documents: DocumentItem[];
  setCurrentView: (view: string) => void;
  isAdmin?: boolean;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ documents, setCurrentView, isAdmin = false }) => {
  const [docSearch, setDocSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showConstitutionModal, setShowConstitutionModal] = useState(false);
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  const categories = ['all', 'Constitution', 'Policy', 'Form', 'Circular'];

  const constitutionDoc = documents.find(d => d.category === 'Constitution') || documents[0];

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(docSearch.toLowerCase());
    const matchesCat = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleDownloadAttempt = (doc: DocumentItem, e: React.MouseEvent) => {
    if (doc.category === 'Constitution' && !isAdmin) {
      e.preventDefault();
      setAdminNotice('Saukewa ta Admin Ne Kadai: Kundin Tsarin Mulki kyauta ne ga kowa ya duba ya karanta online. Saukar da asalin takardar PDF an tanadar wa Admin ne kadai.');
      setTimeout(() => setAdminNotice(null), 6000);
      return;
    }

    // Normal allowed download
    try {
      const a = document.createElement('a');
      a.href = doc.fileUrl;
      a.download = `${doc.title.replace(/\s+/g, '_')}.pdf`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      window.open(doc.fileUrl, '_blank');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#0A2E73] dark:hover:text-sky-400"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/30">
              Admin Access: Downloads Unlocked
            </span>
          )}
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-100 text-[#0A2E73] dark:bg-sky-950 dark:text-sky-300">
            N-NEPEF Document Vault
          </span>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
          Official Publications, Constitution &amp; Forms
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
          Online Constitution Reader, PDF circulars, electrical safety codes, meeting minutes, and registration forms.
        </p>
      </div>

      {/* Admin Notice Alert */}
      {adminNotice && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/70 border-2 border-amber-400/60 rounded-2xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 shadow-lg">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-medium">{adminNotice}</span>
          </div>
          <button
            onClick={() => {
              setAdminNotice(null);
              setShowConstitutionModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 ml-3"
          >
            Bude Don Karanta Online
          </button>
        </div>
      )}

      {/* FEATURED CONSTITUTION BANNER CARD */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border-2 border-sky-500/30 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/40 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#0A2E73] text-[#2EA3F2] rounded-2xl shadow-md shrink-0">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#0A2E73] text-white tracking-wider">
                  Official Constitution
                </span>
                <span className="text-[10px] font-bold text-slate-500">Kundin Tsarin Mulki na N-NEPEF 2020</span>
              </div>
              <h2 className="font-display font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">
                N-NEPEF Official Constitution &amp; Bye-Laws (2020 Revised Edition)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Kowa na da damar karanta cikakkun dokokin kungiyar N-NEPEF a shafin intanet (Online Reader). Saukar da asalin fayil (PDF download) an kebe shi ga Babban Admin na Sakatariya kadai.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
            {/* 1. Public / Free Online Reader */}
            <button
              onClick={() => setShowConstitutionModal(true)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>Karanta Kundin Tsarin Mulki</span>
            </button>

            {/* 2. Download Button (Admin Allowed, Public Restricted) */}
            {isAdmin ? (
              <button
                onClick={(e) => handleDownloadAttempt(constitutionDoc, e)}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#0A2E73] hover:bg-sky-900 text-white text-xs font-bold shadow-lg transition-all"
                title="Super Admin Authorized Download"
              >
                <Download className="w-4 h-4 text-[#2EA3F2]" />
                <span>Download PDF (Admin)</span>
              </button>
            ) : (
              <button
                onClick={(e) => handleDownloadAttempt(constitutionDoc, e)}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-all"
                title="Download is restricted to Secretariat Administrators"
              >
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Saukewa: Admin Ne Kadai</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="glass-card p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={docSearch}
            onChange={(e) => setDocSearch(e.target.value)}
            placeholder="Search documents & circulars..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-[#0A2E73] text-white dark:bg-[#2EA3F2] dark:text-slate-950 shadow'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredDocs.map((doc) => {
          const isConst = doc.category === 'Constitution';
          return (
            <div key={doc.id} className="glass-card p-6 rounded-3xl space-y-4 shadow-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest">
                    {doc.category} • {doc.fileSize} • {doc.format}
                  </span>
                  {isConst && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border border-amber-400/30">
                      Protected Download
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  {doc.title}
                </h3>
                <p className="text-[11px] text-slate-500">Uploaded: {doc.uploadDate} • Downloads: {doc.downloadsCount}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isConst && (
                  <button
                    onClick={() => setShowConstitutionModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow"
                    title="Karanta Kundin Tsarin Mulki Online"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Karanta</span>
                  </button>
                )}

                {isConst && !isAdmin ? (
                  <button
                    onClick={(e) => handleDownloadAttempt(doc, e)}
                    className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold border border-slate-300 dark:border-slate-700 hover:border-amber-400"
                    title="Download is restricted to Secretariat Administrators"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden sm:inline">Admin Only</span>
                  </button>
                ) : (
                  <button
                    onClick={(e) => handleDownloadAttempt(doc, e)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A2E73] text-white text-xs font-bold hover:bg-sky-700 transition-colors shadow"
                  >
                    <Download className="w-4 h-4 text-[#2EA3F2]" />
                    <span>Download</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Constitution Reader Modal */}
      <ConstitutionReaderModal
        isOpen={showConstitutionModal}
        onClose={() => setShowConstitutionModal(false)}
        isAdmin={isAdmin}
        constitutionDoc={constitutionDoc}
      />

    </div>
  );
};

