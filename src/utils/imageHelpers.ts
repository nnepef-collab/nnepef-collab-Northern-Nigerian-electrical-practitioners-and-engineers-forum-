import React from 'react';

// Inline SVG data URLs so they NEVER fail over network or CORS
export const DEFAULT_AVATAR_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="%230A2E73" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="background-color:%23F1F5F9;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

export const DEFAULT_RECEIPT_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="260" viewBox="0 0 24 24" fill="none" stroke="%232EA3F2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="background-color:%230F172A;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;

export const DEFAULT_PHOTO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 24 24" fill="none" stroke="%232EA3F2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="background-color:%231E293B;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;

export const DEFAULT_DOCUMENT_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 24 24" fill="none" stroke="%230A2E73" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="background-color:%23F8FAFC;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;

// High-speed in-memory Data URL cache to completely eliminate repeated network fetches and Supabase storage calls
const assetDataUrlCache = new Map<string, string>();

/**
 * Safely fetches an image and converts it to a base64 Data URL with memory caching.
 * Resolves within milliseconds when already cached.
 */
export async function getCachedBase64Image(
  url: string | undefined | null,
  fallbacks: string[] = []
): Promise<string> {
  const candidates = [url, ...fallbacks].filter((u): u is string => Boolean(u && typeof u === 'string' && u.trim() && u !== 'undefined' && u !== 'null'));
  if (candidates.length === 0) return DEFAULT_AVATAR_SVG;

  // 1. Check in-memory cache first
  for (const candidate of candidates) {
    const cleanUrl = candidate.trim();
    if (assetDataUrlCache.has(cleanUrl)) {
      return assetDataUrlCache.get(cleanUrl)!;
    }
    if (cleanUrl.startsWith('data:')) {
      assetDataUrlCache.set(cleanUrl, cleanUrl);
      return cleanUrl;
    }
  }

  // 2. Fetch or load candidate safely
  for (const candidate of candidates) {
    const cleanUrl = candidate.trim();
    if (cleanUrl.startsWith('data:')) {
      assetDataUrlCache.set(cleanUrl, cleanUrl);
      return cleanUrl;
    }

    try {
      const fullUrl = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
        ? cleanUrl
        : (typeof window !== 'undefined' && window.location ? `${window.location.origin}${cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl}` : cleanUrl);

      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;

      const response = await fetch(fullUrl, {
        mode: 'cors',
        cache: 'default', // Allow browser caching
        signal: controller?.signal
      });
      if (timeoutId) clearTimeout(timeoutId);

      if (response.ok) {
        const blob = await response.blob();
        const base64 = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });

        if (base64 && base64.startsWith('data:')) {
          assetDataUrlCache.set(cleanUrl, base64);
          if (url && typeof url === 'string') assetDataUrlCache.set(url.trim(), base64);
          return base64;
        }
      }
    } catch {
      // Continue to canvas fallback
    }

    // 3. Image element with crossOrigin fallback
    try {
      const dataUrl = await new Promise<string | null>((resolve) => {
        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        let resolved = false;

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        }, 1500);

        tempImg.onload = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          try {
            const c = document.createElement('canvas');
            c.width = tempImg.naturalWidth || 200;
            c.height = tempImg.naturalHeight || 200;
            const ctx = c.getContext('2d');
            if (ctx) {
              ctx.drawImage(tempImg, 0, 0);
              const result = c.toDataURL('image/png');
              resolve(result);
              return;
            }
          } catch {
            // Tainted canvas or error
          }
          resolve(null);
        };

        tempImg.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(null);
          }
        };

        tempImg.src = cleanUrl;
      });

      if (dataUrl && dataUrl.startsWith('data:')) {
        assetDataUrlCache.set(cleanUrl, dataUrl);
        if (url && typeof url === 'string') assetDataUrlCache.set(url.trim(), dataUrl);
        return dataUrl;
      }
    } catch {
      // Continue
    }

    // 4. Proxy route fallback (/api/proxy-image) for CORS-restricted remote images
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      try {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(cleanUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const blob = await res.blob();
          const base64 = await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
          if (base64 && base64.startsWith('data:')) {
            assetDataUrlCache.set(cleanUrl, base64);
            if (url && typeof url === 'string') assetDataUrlCache.set(url.trim(), base64);
            return base64;
          }
        }
      } catch {
        // Continue
      }
    }
  }

  return DEFAULT_AVATAR_SVG;
}

/**
 * Loads an image from base64 or URL safely into an HTMLImageElement using the memory cache
 */
export async function loadHtmlImageFast(url: string | null | undefined, fallbacks: string[] = []): Promise<HTMLImageElement | null> {
  const base64 = await getCachedBase64Image(url, fallbacks);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = base64;
  });
}

// Background eager pre-caching of application brand assets
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const initialAssets = [
      '/nnepef-id-card-logo.jpg',
      '/nnepef-id-card-logo.png',
      '/secretary-signature.png',
      '/secretary-signature.jpg',
      '/logo.png',
      '/logo.jpg'
    ];
    initialAssets.forEach((p) => {
      getCachedBase64Image(p).catch(() => {});
    });
  }, 100);
}

/**
 * Safely handles image loading errors on <img> elements.
 * Replaces broken/empty image sources with a reliable SVG fallback.
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackType: 'avatar' | 'receipt' | 'photo' | 'document' = 'avatar'
) {
  const target = e.currentTarget;
  const fallback =
    fallbackType === 'receipt'
      ? DEFAULT_RECEIPT_SVG
      : fallbackType === 'photo'
      ? DEFAULT_PHOTO_SVG
      : fallbackType === 'document'
      ? DEFAULT_DOCUMENT_SVG
      : DEFAULT_AVATAR_SVG;

  if (target.src !== fallback) {
    target.onerror = null; // Prevent infinite loop
    target.src = fallback;
  }
}

/**
 * Returns a valid URL or fallback string for image rendering.
 */
export function getValidImageUrl(
  url: string | undefined | null,
  fallbackType: 'avatar' | 'receipt' | 'photo' | 'document' = 'avatar'
): string {
  if (!url || typeof url !== 'string' || !url.trim() || url === 'undefined' || url === 'null') {
    return fallbackType === 'receipt'
      ? DEFAULT_RECEIPT_SVG
      : fallbackType === 'photo'
      ? DEFAULT_PHOTO_SVG
      : fallbackType === 'document'
      ? DEFAULT_DOCUMENT_SVG
      : DEFAULT_AVATAR_SVG;
  }
  return url.trim();
}

/**
 * Safely downloads an image or file without navigating the web page or reloading the application.
 * Prevents browser tab redirections and SPA state loss.
 */
export async function downloadFileSafely(
  fileUrl: string | undefined | null,
  filename: string,
  e?: React.MouseEvent | Event
): Promise<boolean> {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
    e.stopPropagation();
  }

  if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.trim()) {
    console.warn('[downloadFileSafely] Empty or invalid file URL');
    return false;
  }

  const url = fileUrl.trim();

  // If it's a data URL or blob URL, create download anchor directly
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      
      // Dispatch synthetic mouse click for maximum mobile & webview compatibility
      try {
        const evt = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        a.dispatchEvent(evt);
      } catch (e) {
        // fallback to standard click
      }
      a.click();
      
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 1000);
      return true;
    } catch (err) {
      console.error('[downloadFileSafely] Direct data URL download error:', err);
    }
  }

  // If it's a web/remote URL, fetch as blob first to guarantee the download attribute works
  // (Standard browser security ignores <a download> for cross-origin URLs and opens/navigates instead)
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 1000);
      return true;
    }
  } catch (err) {
    console.warn('[downloadFileSafely] Blob fetch failed, attempting canvas/safe window fallback:', err);
  }

  // Fallback: Try drawing to image canvas to extract clean data URL
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
          }, 500);
          return;
        }
      } catch (canvasErr) {
        console.warn('[downloadFileSafely] Canvas conversion failed:', canvasErr);
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    };
    img.onerror = () => {
      window.open(url, '_blank', 'noopener,noreferrer');
    };
    img.src = url;
    return true;
  } catch (finalErr) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return false;
  }
}
