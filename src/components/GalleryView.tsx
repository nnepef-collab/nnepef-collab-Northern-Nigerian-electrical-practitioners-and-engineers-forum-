import React, { useState } from 'react';
import { GalleryAlbum } from '../types';
import { Image as ImageIcon, ArrowLeft, X } from 'lucide-react';
import { handleImageError, getValidImageUrl } from '../utils/imageHelpers';

interface GalleryViewProps {
  gallery: GalleryAlbum[];
  setCurrentView: (view: string) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ gallery, setCurrentView }) => {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

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
          N-NEPEF Media Gallery
        </span>
      </div>

      <div className="text-center space-y-2">
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
          Event Albums &amp; Activity Photo Archives
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
          Explore photographs from state chapter inaugurations, engineering award ceremonies, and field safety inspections.
        </p>
      </div>

      <div className="space-y-12">
        {gallery.map((album) => (
          <div key={album.id} className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest">
                {album.category} • {album.date}
              </span>
              <h3 className="font-display font-extrabold text-xl text-slate-900 dark:text-white">
                {album.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">{album.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {album.photos.map((photo, idx) => (
                <div
                  key={idx}
                  onClick={() => setActivePhoto(photo)}
                  className="rounded-2xl overflow-hidden aspect-video cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                >
                  <img 
                    src={getValidImageUrl(photo, 'photo')} 
                    alt={album.title} 
                    onError={(e) => handleImageError(e, 'photo')}
                    className="w-full h-full object-cover" 
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-sky-400"
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={getValidImageUrl(activePhoto, 'photo')} 
              alt="Gallery Preview" 
              onError={(e) => handleImageError(e, 'photo')}
              className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" 
            />
          </div>
        </div>
      )}

    </div>
  );
};
