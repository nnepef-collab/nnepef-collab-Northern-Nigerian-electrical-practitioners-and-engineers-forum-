import React, { useState } from 'react';
import { Member } from '../types';
import { Logo } from './Logo';
import { ShieldCheck, Download, Printer, QrCode, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { handleImageError, getValidImageUrl, downloadFileSafely } from '../utils/imageHelpers';
import { OFFICIAL_NNEPEF_LOGO } from '../constants/logo';

interface MembershipCardProps {
  member: Member;
  logoUrl?: string;
}

/**
 * Safely loads an image (including from Supabase Storage or data URI)
 * converting it to a blob or data URL so that drawing it on an HTML5 canvas
 * never causes a tainted canvas SecurityError.
 */
async function loadSafeCanvasImage(url: string | undefined | null): Promise<HTMLImageElement | null> {
  if (!url || typeof url !== 'string' || !url.trim() || url === 'undefined' || url === 'null') {
    return null;
  }
  const cleanUrl = url.trim();

  // If it is already a data URI or blob URL, load directly
  if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = cleanUrl;
    });
  }

  // Attempt fetch as blob to avoid canvas crossOrigin security taint
  try {
    const response = await fetch(cleanUrl, { mode: 'cors', cache: 'no-cache' });
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve(img);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          resolve(null);
        };
        img.src = blobUrl;
      });
    }
  } catch (fetchErr) {
    console.warn('[MembershipCard] Direct blob fetch failed, falling back to crossOrigin Image:', fetchErr);
  }

  // Fallback to Image with crossOrigin = anonymous
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = cleanUrl;
  });
}

function drawAvatarFallback(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(x, y, w, h);
  
  // Head
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.38, w * 0.22, 0, Math.PI * 2);
  ctx.fill();
  
  // Body
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.95, w * 0.42, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

export const MembershipCard: React.FC<MembershipCardProps> = ({ member, logoUrl }) => {
  const displayLogo = logoUrl && logoUrl.trim() !== '' && logoUrl !== '/logo.png' ? logoUrl : OFFICIAL_NNEPEF_LOGO;
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passportPhotoSrc = member.passportUrl || member.passportPhotoUrl || '';
  const memberIdDisplay = member.membershipId || (member.applicationReference ? `REF-${member.applicationReference}` : 'PENDING APPROVAL');

  const handlePrintCard = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Direct print failed, opening card print view safely:', e);
    }
  };

  const handleDownloadCardImage = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      // 1. Create high-resolution offline canvas for the card
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 675;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not supported');
      }

      // 2. Preload photo and logo safely
      const [photoImg, logoImg] = await Promise.all([
        passportPhotoSrc ? loadSafeCanvasImage(passportPhotoSrc) : Promise.resolve(null),
        displayLogo ? loadSafeCanvasImage(displayLogo) : Promise.resolve(null)
      ]);

      const drawCardGraphics = (includePhoto: boolean) => {
        // Card Background Gradient
        const grad = ctx.createLinearGradient(0, 0, 1080, 675);
        grad.addColorStop(0, '#0A2E73');
        grad.addColorStop(0.5, '#08245A');
        grad.addColorStop(1, '#05193C');
        ctx.fillStyle = grad;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(0, 0, 1080, 675, 40);
          ctx.fill();
        } else {
          ctx.fillRect(0, 0, 1080, 675);
        }

        // Border Accent
        ctx.strokeStyle = '#2EA3F2';
        ctx.lineWidth = 12;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(0, 0, 1080, 675, 40);
          ctx.stroke();
        } else {
          ctx.strokeRect(0, 0, 1080, 675);
        }

        // Draw Watermark / Logo if available
        if (logoImg) {
          try {
            ctx.save();
            ctx.globalAlpha = 0.12;
            ctx.drawImage(logoImg, 800, 380, 240, 240);
            ctx.restore();

            // Header Small Logo
            ctx.save();
            ctx.drawImage(logoImg, 60, 48, 70, 70);
            ctx.restore();
          } catch (logoErr) {
            console.warn('[MembershipCard] Error drawing logo on canvas:', logoErr);
          }
        }

        // Header Text
        const headerX = logoImg ? 145 : 60;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px Arial, sans-serif';
        ctx.fillText('N-NEPEF 2020', headerX, 75);

        ctx.fillStyle = '#7DD3FC';
        ctx.font = 'bold 15px Arial, sans-serif';
        ctx.fillText('NORTHERN NIGERIAN ELECTRICAL PRACTITIONERS AND ENGINEERS FORUM', headerX, 100);

        ctx.fillStyle = '#FCD34D';
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.fillText('MEMBERSHIP ID CARD', headerX, 122);

        // Official Member Badge
        ctx.fillStyle = '#10B981';
        ctx.fillRect(800, 45, 220, 50);
        ctx.fillStyle = '#022C22';
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.fillText('OFFICIAL MEMBER', 820, 78);

        // Divider
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(60, 138);
        ctx.lineTo(1020, 138);
        ctx.stroke();

        // Photo Frame
        const photoBoxX = 60;
        const photoBoxY = 160;
        const photoBoxW = 220;
        const photoBoxH = 280;

        ctx.fillStyle = '#0F172A';
        ctx.fillRect(photoBoxX, photoBoxY, photoBoxW, photoBoxH);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.strokeRect(photoBoxX, photoBoxY, photoBoxW, photoBoxH);

        // Draw Passport Photo or Avatar
        if (includePhoto && photoImg) {
          try {
            ctx.drawImage(photoImg, photoBoxX, photoBoxY, photoBoxW, photoBoxH);
          } catch (drawPhotoErr) {
            console.warn('[MembershipCard] Error drawing photo image, drawing fallback avatar:', drawPhotoErr);
            drawAvatarFallback(ctx, photoBoxX, photoBoxY, photoBoxW, photoBoxH);
          }
        } else {
          drawAvatarFallback(ctx, photoBoxX, photoBoxY, photoBoxW, photoBoxH);
        }

        // Member Details
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 38px Arial, sans-serif';
        ctx.fillText(member.fullName || 'Registered Member', 320, 205);

        // ID Tag Box
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(320, 230, 460, 55);
        ctx.strokeStyle = '#2EA3F2';
        ctx.lineWidth = 2;
        ctx.strokeRect(320, 230, 460, 55);
        ctx.fillStyle = '#2EA3F2';
        ctx.font = 'bold 26px monospace';
        ctx.fillText(memberIdDisplay, 335, 268);

        // Position
        ctx.fillStyle = '#FCD34D';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.fillText(member.position || 'Practicing Member', 320, 325);

        // Occupation & Specialization
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '20px Arial, sans-serif';
        const specLine = member.occupation
          ? `${member.occupation} • ${member.specialization || 'Electrical Engineering'}`
          : (member.specialization || 'Electrical Engineering Specialist');
        ctx.fillText(specLine, 320, 365);

        // State & LGA
        ctx.fillStyle = '#BAE6FD';
        ctx.font = 'bold 20px Arial, sans-serif';
        const locationLine = `State: ${member.state || 'General'} State Chapter${member.lga ? ` • ${member.lga} LGA` : ''}`;
        ctx.fillText(locationLine, 320, 405);

        // Bottom Bar Divider
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(60, 560);
        ctx.lineTo(1020, 560);
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = '20px Arial, sans-serif';
        ctx.fillText(`Issued: ${member.issueDate || '2021-01-01'}`, 60, 610);
        ctx.fillText(`Expiry: ${member.expiryDate || '2026-01-01'}`, 750, 610);
      };

      // Draw first with photo
      drawCardGraphics(true);

      // Attempt clean export
      let dataUrl: string;
      try {
        dataUrl = canvas.toDataURL('image/png');
      } catch (taintErr) {
        console.warn('[MembershipCard] Canvas tainted by cross-origin resource, redrawing clean fallback:', taintErr);
        drawCardGraphics(false);
        dataUrl = canvas.toDataURL('image/png');
      }

      const filename = `NNEPEF-IDCard-${(member.membershipId || member.fullName || 'Member').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      await downloadFileSafely(dataUrl, filename, e);
      
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error('[MembershipCard] ID card image generation error:', err);
      setErrorMessage(err?.message || 'Failed to generate ID card image. You can use the Print / PDF button instead.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Action Toolbar */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-between bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 gap-4">
        <div>
          <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">Official Membership ID Card</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">High-Security Smart Membership Card</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleDownloadCardImage}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 text-emerald-200 animate-spin" />
                <span>Generating Card...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Card Saved!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-emerald-200" />
                <span>Download ID Card (PNG)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrintCard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A2E73] text-white font-bold text-xs hover:bg-sky-700 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#2EA3F2]" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="no-print p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* PRINTABLE CARD LAYOUT CONTAINER */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
        
        {/* CARD FRONT SIDE */}
        <div className="w-[360px] h-[225px] rounded-2xl bg-gradient-to-br from-[#0A2E73] via-[#08245A] to-[#05193C] text-white p-4 relative overflow-hidden shadow-2xl border-2 border-[#2EA3F2] flex flex-col justify-between select-none">
          {/* Hologram Background Watermark */}
          <div className="absolute -right-8 -bottom-8 w-40 h-40 opacity-15 pointer-events-none">
            <img 
              src={displayLogo} 
              alt="" 
              className="w-full h-full object-contain" 
              style={{
                filter: 'none',
                WebkitFilter: 'none',
                mixBlendMode: 'normal',
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

          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-white/20 pb-2">
            <div className="flex items-center gap-2">
              <img 
                src={displayLogo} 
                alt="N-NEPEF" 
                className="w-8 h-8 object-contain" 
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
              <div>
                <h5 className="font-display font-extrabold text-[11px] leading-none text-white tracking-tight">N-NEPEF 2020</h5>
                <span className="text-[6.5px] text-sky-300 uppercase tracking-tight font-bold block">NORTHERN NIGERIAN ELECTRICAL PRACTITIONERS &amp; ENGINEERS FORUM</span>
                <span className="text-[6.5px] text-amber-300 uppercase tracking-widest font-bold block">MEMBERSHIP ID CARD</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-extrabold text-[8px] uppercase tracking-wider">
              OFFICIAL MEMBER
            </span>
          </div>

          {/* Card Body */}
          <div className="flex items-center gap-3 my-1">
            <img 
              src={getValidImageUrl(passportPhotoSrc, 'avatar')} 
              alt={member.fullName} 
              onError={(e) => handleImageError(e, 'avatar')}
              className="w-20 h-24 rounded-lg object-cover border-2 border-white/80 shadow-md flex-shrink-0 bg-slate-900"
            />

            <div className="space-y-0.5 overflow-hidden text-left">
              <h4 className="font-display font-extrabold text-xs sm:text-sm text-white truncate leading-tight">
                {member.fullName}
              </h4>
              <p className="font-mono font-extrabold text-[10px] text-[#2EA3F2] bg-slate-950/60 px-1.5 py-0.5 rounded border border-sky-500/30 inline-block">
                {memberIdDisplay}
              </p>
              <p className="text-[10px] font-bold text-amber-300 truncate">
                {member.position || 'Practicing Member'}
              </p>
              <p className="text-[9px] text-slate-200 truncate">
                {member.occupation ? `${member.occupation} • ${member.specialization || 'Electrical Engineering'}` : (member.specialization || 'Electrical Engineering')}
              </p>
              <p className="text-[9px] text-sky-200 truncate">
                State: <strong>{member.state || 'General'} State</strong> {member.lga ? `• ${member.lga} LGA` : ''}
              </p>
            </div>
          </div>

          {/* Card Footer Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-white/20 text-[8px] text-slate-300">
            <div>
              <span>Issued: <strong className="text-white">{member.issueDate || '2021-01-01'}</strong></span>
            </div>
            <div>
              <span>Expiry: <strong className="text-white">{member.expiryDate || '2026-01-01'}</strong></span>
            </div>
          </div>
        </div>

        {/* CARD BACK SIDE */}
        <div className="w-[360px] h-[225px] rounded-2xl bg-slate-900 text-white p-4 relative overflow-hidden shadow-2xl border-2 border-slate-700 flex flex-col justify-between select-none">
          
          {/* Magnetic Stripe Graphic */}
          <div className="w-full h-8 bg-slate-950 rounded-md my-1 border-y border-slate-800 flex items-center justify-end px-3">
            <span className="font-mono text-[9px] text-slate-500 tracking-widest">N-NEPEF SMART CHIP 2020</span>
          </div>

          {/* QR Code & Barcode Content */}
          <div className="flex items-center justify-between gap-3 px-2">
            
            {/* SVG Simulated QR Code */}
            <div className="bg-white p-1.5 rounded-lg flex-shrink-0 shadow">
              <svg width="56" height="56" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill="white"/>
                <rect x="10" y="10" width="25" height="25" fill="#0A2E73"/>
                <rect x="15" y="15" width="15" height="15" fill="white"/>
                <rect x="65" y="10" width="25" height="25" fill="#0A2E73"/>
                <rect x="70" y="15" width="15" height="15" fill="white"/>
                <rect x="10" y="65" width="25" height="25" fill="#0A2E73"/>
                <rect x="15" y="70" width="15" height="15" fill="white"/>
                <rect x="40" y="10" width="15" height="15" fill="#0A2E73"/>
                <rect x="40" y="40" width="20" height="20" fill="#2EA3F2"/>
                <rect x="65" y="65" width="15" height="15" fill="#0A2E73"/>
                <rect x="80" y="80" width="10" height="10" fill="#0A2E73"/>
              </svg>
            </div>

            <div className="space-y-1 text-left flex-1">
              <p className="text-[9px] text-slate-300 leading-tight">
                This card remains the property of Northern Nigerian Electrical Practitioners &amp; Engineers Forum. If found, please return to Head Office or call +234 906 343 5546 / +234 803 055 9938.
              </p>
              <div className="text-[8px] text-sky-400 font-mono font-bold">
                VERIFY AT: nepef.org.ng/verify
              </div>
            </div>

          </div>

          {/* Barcode Graphic Bottom */}
          <div className="bg-white p-1.5 rounded-lg text-slate-950 text-center space-y-0.5">
            <div className="h-5 flex items-center justify-center space-x-1">
              {/* Simulated barcode lines */}
              <div className="w-1 h-full bg-slate-950"></div>
              <div className="w-0.5 h-full bg-slate-950"></div>
              <div className="w-2 h-full bg-slate-950"></div>
              <div className="w-1 h-full bg-slate-950"></div>
              <div className="w-0.5 h-full bg-slate-950"></div>
              <div className="w-3 h-full bg-slate-950"></div>
              <div className="w-1 h-full bg-slate-950"></div>
              <div className="w-0.5 h-full bg-slate-950"></div>
              <div className="w-2 h-full bg-slate-950"></div>
              <div className="w-1 h-full bg-slate-950"></div>
              <div className="w-0.5 h-full bg-slate-950"></div>
              <div className="w-3 h-full bg-slate-950"></div>
              <div className="w-1 h-full bg-slate-950"></div>
              <div className="w-2 h-full bg-slate-950"></div>
              <div className="w-1 h-full bg-slate-950"></div>
            </div>
            <div className="font-mono text-[9px] font-bold tracking-widest leading-none">
              *{memberIdDisplay}*
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
