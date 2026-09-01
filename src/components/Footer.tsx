import React from 'react';
import { Logo } from './Logo';
import { MapPin, Phone, Mail, Globe, Facebook, Twitter, Linkedin, Youtube, ShieldCheck } from 'lucide-react';
import { NORTHERN_STATES } from '../data/initialData';
import { ForumSettings } from '../types';
import { OFFICIAL_NNEPEF_LOGO } from '../constants/logo';

interface FooterProps {
  setCurrentView: (view: string) => void;
  settings?: ForumSettings;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentView, settings }) => {
  return (
    <footer className="bg-[#05193C] text-white pt-16 pb-12 border-t-4 border-[#2EA3F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          
          {/* Column 1: Forum Identity */}
          <div className="space-y-4">
            <Logo size="lg" showText={true} variant="light" logoUrl={settings?.logoUrl} forumName={settings?.forumName} tagline={settings?.tagline} />
            <p className="text-xs text-slate-300 leading-relaxed pt-2">
              {settings?.aboutUsContent || 'The Northern Nigerian Electrical Practitioners & Engineers Forum (N-NEPEF 2020) is the apex professional body unifying electrical engineers, contractors, power technologists, and safety inspectors across Northern Nigeria.'}
            </p>
            <div className="flex items-center gap-3 pt-2">
              {settings?.socialFacebook && (
                <a href={settings.socialFacebook} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 hover:bg-[#2EA3F2] hover:text-slate-950 transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {settings?.socialTwitter && (
                <a href={settings.socialTwitter} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 hover:bg-[#2EA3F2] hover:text-slate-950 transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {settings?.socialLinkedin && (
                <a href={settings.socialLinkedin} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 hover:bg-[#2EA3F2] hover:text-slate-950 transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
              {settings?.socialYoutube && (
                <a href={settings.socialYoutube} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 hover:bg-[#2EA3F2] hover:text-slate-950 transition-colors">
                  <Youtube className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="font-display font-bold text-sm text-[#2EA3F2] uppercase tracking-wider">Quick Navigation</h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <button onClick={() => setCurrentView('home')} className="hover:text-white hover:underline transition-colors">Home Page</button>
              </li>
              <li>
                <button onClick={() => setCurrentView('leadership')} className="hover:text-white hover:underline transition-colors flex items-center gap-1.5 text-sky-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Leadership Directory</span>
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('verify')} className="hover:text-white hover:underline transition-colors flex items-center gap-1.5 text-sky-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Public Member Verification</span>
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('register')} className="hover:text-white hover:underline transition-colors">Member Online Registration</button>
              </li>
              <li>
                <button onClick={() => setCurrentView('news')} className="hover:text-white hover:underline transition-colors">News &amp; Technical Publications</button>
              </li>
              <li>
                <button onClick={() => setCurrentView('events')} className="hover:text-white hover:underline transition-colors">Upcoming Events &amp; Summits</button>
              </li>
              <li>
                <button onClick={() => setCurrentView('gallery')} className="hover:text-white hover:underline transition-colors">Media &amp; Photo Gallery</button>
              </li>
              <li>
                <button onClick={() => setCurrentView('documents')} className="hover:text-white hover:underline transition-colors">Downloads &amp; Constitution</button>
              </li>
            </ul>
          </div>

          {/* Column 3: 19 Northern States Coverage */}
          <div className="space-y-3">
            <h4 className="font-display font-bold text-sm text-[#2EA3F2] uppercase tracking-wider">19 Northern Chapters</h4>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
              {NORTHERN_STATES.map((state) => (
                <div key={state} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  <span>{state}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 4: Contact & Secretariat */}
          <div className="space-y-3">
            <h4 className="font-display font-bold text-sm text-[#2EA3F2] uppercase tracking-wider">Secretariat Contact</h4>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#2EA3F2] flex-shrink-0 mt-0.5" />
                <span>{settings?.headquarters || 'No. 2, Gwarzo Road, Opposite Rijiyar Zaki Bus Stop, Kano State, Nigeria.'}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-[#2EA3F2] flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div>{settings?.contactPhone || '+234 906 343 5546'}</div>
                  {settings?.contactPhoneSecondary && <div>{settings.contactPhoneSecondary}</div>}
                  {settings?.contactPhoneTertiary && <div>{settings.contactPhoneTertiary}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#2EA3F2] flex-shrink-0" />
                <span>{settings?.contactEmail || 'info@nepef.org.ng'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#2EA3F2] flex-shrink-0" />
                <span>www.nepef.org.ng</span>
              </div>
            </div>
          </div>
        </div>

        {/* Prominent Centered Official N-NEPEF Logo Section at Bottom of Portal */}
        <div className="py-10 border-b border-slate-800 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 relative flex items-center justify-center p-3 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-2xl group hover:border-[#2EA3F2] transition-all duration-300">
            <img 
              src={settings?.logoUrl && settings.logoUrl.trim() !== '' && settings.logoUrl !== '/logo.png' ? settings.logoUrl : OFFICIAL_NNEPEF_LOGO} 
              alt="Official N-NEPEF 2020 Logo" 
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              style={{
                filter: 'none',
                WebkitFilter: 'none',
                mixBlendMode: 'normal',
                opacity: 1,
                forcedColorAdjust: 'none'
              }}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== OFFICIAL_NNEPEF_LOGO) {
                  target.src = OFFICIAL_NNEPEF_LOGO;
                }
              }}
            />
          </div>
          <div className="space-y-1.5 max-w-xl mx-auto px-4">
            <h3 className="font-display font-extrabold text-sm sm:text-base md:text-lg text-white tracking-wider">
              NORTHERN NIGERIAN ELECTRICAL PRACTITIONERS &amp; ENGINEERS FORUM
            </h3>
            <p className="text-xs sm:text-sm text-[#2EA3F2] font-extrabold tracking-widest uppercase">
              N-NEPEF 2020 • OFFICIAL EMBLEM
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} N-NEPEF 2020. All Rights Reserved. Northern Nigerian Electrical Practitioners &amp; Engineers Forum.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => setCurrentView('home')} className="hover:text-white">Privacy Policy</button>
            <button onClick={() => setCurrentView('home')} className="hover:text-white">Terms of Membership</button>
            <button onClick={() => setCurrentView('admin-login')} className="hover:text-white text-sky-400 font-semibold">Admin Panel</button>
          </div>
        </div>
      </div>
    </footer>
  );
};
