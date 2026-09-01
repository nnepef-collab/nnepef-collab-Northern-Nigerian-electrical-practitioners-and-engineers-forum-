import React, { useState } from 'react';
import { DocumentItem } from '../types';
import { FolderDown, Download, FileText, ArrowLeft, Search } from 'lucide-react';

interface DocumentsViewProps {
  documents: DocumentItem[];
  setCurrentView: (view: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ documents, setCurrentView }) => {
  const [docSearch, setDocSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Constitution', 'Policy', 'Form', 'Circular'];

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(docSearch.toLowerCase());
    const matchesCat = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

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
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-100 text-[#0A2E73] dark:bg-sky-950 dark:text-sky-300">
          N-NEPEF Document Vault
        </span>
      </div>

      <div className="text-center space-y-2">
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
          Official Publications, Constitution &amp; Forms
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
          Download PDF circulars, electrical safety codes, meeting minutes, and registration forms.
        </p>
      </div>

      {/* Search & Category Filter */}
      <div className="glass-card p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={docSearch}
            onChange={(e) => setDocSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-[#0A2E73] text-white dark:bg-[#2EA3F2] dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredDocs.map((doc) => (
          <div key={doc.id} className="glass-card p-6 rounded-3xl space-y-4 shadow-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest">
                {doc.category} • {doc.fileSize} • {doc.format}
              </span>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                {doc.title}
              </h3>
              <p className="text-[11px] text-slate-500">Uploaded: {doc.uploadDate} • Downloads: {doc.downloadsCount}</p>
            </div>

            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A2E73] text-white text-xs font-bold hover:bg-sky-700 transition-colors shadow flex-shrink-0"
            >
              <Download className="w-4 h-4 text-[#2EA3F2]" />
              <span>Download PDF</span>
            </a>
          </div>
        ))}
      </div>

    </div>
  );
};
