import React from 'react';
import { OFFICIAL_NNEPEF_LOGO } from '../constants/logo';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'light' | 'dark' | 'auto';
  logoUrl?: string;
  forumName?: string;
  tagline?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  showText = false,
  variant = 'auto',
  logoUrl
}) => {
  const sizeMap = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18', // 48px mobile, 64px-72px desktop
    lg: 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20',
    xl: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm sm:text-base md:text-lg',
    lg: 'text-base sm:text-lg md:text-xl',
    xl: 'text-xl sm:text-2xl md:text-3xl'
  };

  const displayLogo = logoUrl && logoUrl.trim() !== '' && logoUrl !== '/logo.png' ? logoUrl : OFFICIAL_NNEPEF_LOGO;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className={`${sizeMap[size]} relative flex-shrink-0 group cursor-pointer flex items-center justify-center`}>
        <img 
          src={displayLogo} 
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

      {showText && (
        <span className={`font-display font-extrabold tracking-wider whitespace-nowrap ${
          variant === 'light' ? 'text-white' :
          variant === 'dark' ? 'text-[#0A2E73]' :
          'text-[#0A2E73] dark:text-sky-400'
        } ${textSizes[size]}`}>
          NNEPEF <span className="text-[#2EA3F2]">2020</span>
        </span>
      )}
    </div>
  );
};

