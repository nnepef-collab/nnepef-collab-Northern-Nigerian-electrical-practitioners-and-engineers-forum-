import React, { useState } from 'react';
import { NewsArticle } from '../types';
import { Newspaper, Search, Eye, MessageSquare, ArrowLeft, X } from 'lucide-react';

interface NewsViewProps {
  news: NewsArticle[];
  setCurrentView: (view: string) => void;
}

export const NewsView: React.FC<NewsViewProps> = ({ news, setCurrentView }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);

  const categories = ['all', 'Engineering', 'Policy', 'Announcements', 'Projects'];

  const filteredNews = selectedCategory === 'all'
    ? news
    : news.filter(n => n.category === selectedCategory);

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
          N-NEPEF News &amp; Publications
        </span>
      </div>

      <div className="text-center space-y-2">
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
          News, Policy Updates &amp; Technical Publications
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
          Stay informed on electrical standards, power distribution initiatives, and technological developments across Northern Nigeria.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              selectedCategory === cat
                ? 'bg-[#0A2E73] text-white dark:bg-[#2EA3F2] dark:text-slate-950 shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredNews.map((article) => (
          <div
            key={article.id}
            onClick={() => setActiveArticle(article)}
            className="glass-card rounded-3xl overflow-hidden cursor-pointer hover:border-[#2EA3F2] transition-all flex flex-col justify-between shadow-lg group"
          >
            <div>
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={article.imageUrl} 
                  alt={article.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#0A2E73] text-white text-[10px] font-extrabold uppercase tracking-wider">
                  {article.category}
                </span>
              </div>

              <div className="p-6 space-y-3">
                <div className="text-[10px] text-slate-500 font-bold">
                  By {article.author} • {article.date}
                </div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                  {article.summary}
                </p>
              </div>
            </div>

            <div className="p-6 pt-0 flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400 border-t border-slate-100 dark:border-slate-800/60 mt-4">
              <span>Read Article →</span>
              <div className="flex items-center gap-3 text-slate-400">
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{article.views}</span>
                <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{article.commentsCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Article Detail Reader Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-3xl p-6 sm:p-10 rounded-3xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <span className="px-3 py-1 rounded-full bg-sky-100 text-[#0A2E73] dark:bg-sky-950 dark:text-sky-300 text-xs font-extrabold uppercase">
                {activeArticle.category}
              </span>
              <button onClick={() => setActiveArticle(null)} className="p-2 text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                {activeArticle.title}
              </h2>
              <div className="text-xs text-slate-500 font-semibold">
                Published by {activeArticle.author} on {activeArticle.date}
              </div>

              <img src={activeArticle.imageUrl} alt="" className="w-full h-64 object-cover rounded-2xl shadow" />

              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed pt-2">
                {activeArticle.content}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveArticle(null)}
                className="px-6 py-2.5 rounded-xl bg-[#0A2E73] text-white text-xs font-bold"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
