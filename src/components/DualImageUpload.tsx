import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Upload, X, Eye, RefreshCw, AlertCircle, CheckCircle2, Video } from 'lucide-react';
import { uploadFileToSQLiteStorage } from '../services/sqliteService';
import { handleImageError, getValidImageUrl } from '../utils/imageHelpers';

interface DualImageUploadProps {
  label: string;
  subLabel?: string;
  currentUrl: string;
  onImageChange: (url: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  accept?: string;
  aspectRatio?: 'square' | 'receipt' | 'auto';
  icon?: React.ComponentType<{ className?: string }>;
  required?: boolean;
  bucket?: 'passports' | 'receipts' | 'documents';
}

async function compressImageFile(file: File | Blob, maxDimension = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type || !file.type.startsWith('image/')) {
      resolve(file instanceof File ? file : new File([file], 'image.jpg', { type: 'image/jpeg' }));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const fileName = file instanceof File ? file.name : 'compressed.jpg';
              resolve(new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() }));
            } else {
              resolve(file instanceof File ? file : new File([file], 'image.jpg', { type: 'image/jpeg' }));
            }
          },
          'image/jpeg',
          quality
        );
      } else {
        resolve(file instanceof File ? file : new File([file], 'image.jpg', { type: 'image/jpeg' }));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file instanceof File ? file : new File([file], 'image.jpg', { type: 'image/jpeg' }));
    };
    img.src = url;
  });
}

export const DualImageUpload: React.FC<DualImageUploadProps> = ({
  label,
  subLabel,
  currentUrl,
  onImageChange,
  onUploadingChange,
  accept = 'image/*',
  aspectRatio = 'auto',
  icon: Icon = Upload,
  required = false,
  bucket,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>(currentUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showModalPreview, setShowModalPreview] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (currentUrl !== previewUrl) {
      setPreviewUrl(currentUrl);
    }
  }, [currentUrl, previewUrl]);

  // Clean up media stream on unmount or webcam close
  const stopWebcam = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setShowWebcamModal(false);
    setWebcamError(null);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    if (!rawFile.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    onUploadingChange?.(true);

    const file = await compressImageFile(rawFile, 1200, 0.8);

    if (bucket) {
      try {
        const uploadedUrl = await uploadFileToSQLiteStorage(bucket, file, file.name);
        if (uploadedUrl) {
          setPreviewUrl(uploadedUrl);
          onImageChange(uploadedUrl);
          setUploadError(null);
        } else {
          throw new Error('Upload returned an empty URL.');
        }
      } catch (err: any) {
        console.warn('[DualImageUpload] Storage Upload Failed, falling back to local Data URL:', err);
        // Fallback to reading file as base64 Data URL so user can still complete form
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (result) {
            setPreviewUrl(result);
            onImageChange(result);
            setUploadError(null);
          }
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploading(false);
        onUploadingChange?.(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setPreviewUrl(result);
          onImageChange(result);
        }
        setIsUploading(false);
        onUploadingChange?.(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const openWebcam = async () => {
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setShowWebcamModal(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.warn('Webcam permission or device error, falling back to camera input:', err);
      setWebcamError('Unable to access webcam directly. Opening standard device camera...');
      setTimeout(() => {
        cameraInputRef.current?.click();
      }, 500);
    }
  };

  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        stopWebcam();

        if (bucket) {
          setUploadError(null);
          setIsUploading(true);
          onUploadingChange?.(true);

          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                const uploadedUrl = await uploadFileToSQLiteStorage(bucket, blob, `capture-${Date.now()}.jpg`);
                if (uploadedUrl) {
                  setPreviewUrl(uploadedUrl);
                  onImageChange(uploadedUrl);
                  setUploadError(null);
                } else {
                  throw new Error('Snapshot upload returned an empty URL.');
                }
              } catch (err: any) {
                console.warn('[DualImageUpload] Snapshot Upload Failed, using Data URL fallback:', err);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                setPreviewUrl(dataUrl);
                onImageChange(dataUrl);
                setUploadError(null);
              } finally {
                setIsUploading(false);
                onUploadingChange?.(false);
              }
            } else {
              setIsUploading(false);
              onUploadingChange?.(false);
            }
          }, 'image/jpeg', 0.9);
        } else {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setPreviewUrl(dataUrl);
          onImageChange(dataUrl);
        }
      }
    }
  };

  const handleCameraClick = () => {
    // If mobile user agent, click camera input directly for seamless native app camera UI
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      cameraInputRef.current?.click();
    } else {
      // Desktop / Laptop: Try live camera view first, or fall back to capture input
      openWebcam();
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl('');
    onImageChange('');
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const hasImage = Boolean(previewUrl && previewUrl.trim().length > 0);

  return (
    <div className="bg-slate-50 dark:bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
      
      {/* Hidden File Inputs */}
      {/* 1. Camera Input with capture="environment" for Native Mobile Camera */}
      <input
        type="file"
        ref={cameraInputRef}
        accept={accept}
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />
      {/* 2. Gallery Input for Device Storage / Photo Library */}
      <input
        type="file"
        ref={galleryInputRef}
        accept={accept}
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Title & Badge Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Icon className="w-4 h-4 text-[#2EA3F2]" />
            <span>{label}</span>
            {required && <span className="text-rose-500 font-extrabold">*</span>}
          </div>
          {subLabel && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subLabel}</p>}
        </div>

        {isUploading ? (
          <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-[#2EA3F2] text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Uploading...</span>
          </span>
        ) : hasImage ? (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Uploaded</span>
          </span>
        ) : null}
      </div>

      {/* Upload Error Banner if upload fails */}
      {uploadError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 shadow-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Upload Failed</p>
            <p className="text-[11px] mt-0.5 opacity-90">{uploadError}</p>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-400 hover:text-rose-600 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Image Preview Window */}
      <div className="relative group">
        <div
          className={`w-full overflow-hidden rounded-xl border-2 ${
            hasImage
              ? 'border-emerald-500/40 bg-slate-900/5 dark:bg-slate-950'
              : 'border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50'
          } flex items-center justify-center transition-all ${
            aspectRatio === 'square' ? 'h-36 sm:h-40' : aspectRatio === 'receipt' ? 'h-48 sm:h-56' : 'h-40 sm:h-48'
          }`}
        >
          {isUploading ? (
            <div className="text-center p-4 space-y-2">
              <RefreshCw className="w-8 h-8 mx-auto text-[#2EA3F2] animate-spin" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Saving to Local Secure Storage...
              </p>
              <p className="text-[10px] text-slate-400">Please wait while your document is saved</p>
            </div>
          ) : hasImage ? (
            <img
              src={getValidImageUrl(previewUrl, bucket === 'receipts' ? 'receipt' : 'avatar')}
              alt={label}
              onError={(e) => handleImageError(e, bucket === 'receipts' ? 'receipt' : 'avatar')}
              className="w-full h-full object-contain p-1 transition-transform duration-200 group-hover:scale-102"
            />
          ) : (
            <div className="text-center p-4 space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-sky-100 dark:bg-sky-950 text-[#2EA3F2] flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                No image selected yet
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Choose Camera or Gallery option below
              </p>
            </div>
          )}
        </div>

        {/* Hover Overlay Controls for existing image */}
        {hasImage && !isUploading && (
          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3 backdrop-blur-xs">
            <button
              type="button"
              onClick={() => setShowModalPreview(true)}
              className="p-2.5 rounded-xl bg-white/20 text-white hover:bg-white/30 backdrop-blur-md transition-colors"
              title="View Full Preview"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="p-2.5 rounded-xl bg-rose-500/80 text-white hover:bg-rose-600 transition-colors"
              title="Remove Photo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* TWO PROMINENT UPLOAD BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        
        {/* Option 1: Take Photo (Camera) */}
        <button
          type="button"
          onClick={handleCameraClick}
          disabled={isUploading}
          className="w-full py-2.5 px-3 rounded-xl bg-[#0A2E73] hover:bg-[#08245A] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98 cursor-pointer"
        >
          <Camera className="w-4 h-4 text-[#2EA3F2]" />
          <span>{isUploading ? 'Uploading...' : 'Take Photo (Camera)'}</span>
        </button>

        {/* Option 2: Choose from Gallery / Storage */}
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={isUploading}
          className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98 cursor-pointer"
        >
          <ImageIcon className="w-4 h-4 text-[#2EA3F2]" />
          <span>{isUploading ? 'Uploading...' : 'Choose from Gallery'}</span>
        </button>

      </div>

      {/* FULL-SCREEN IMAGE PREVIEW MODAL */}
      {showModalPreview && previewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-4 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#2EA3F2]" />
                <span>{label} Preview</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModalPreview(false)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-950/10 dark:bg-slate-950/50 rounded-xl p-2">
              <img src={previewUrl} alt={label} className="max-w-full max-h-[60vh] object-contain rounded-lg" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModalPreview(false)}
                className="px-4 py-2 rounded-xl bg-[#0A2E73] text-white font-bold text-xs hover:bg-[#08245A]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP/LAPTOP LIVE WEBCAM CAPTURE MODAL */}
      {showWebcamModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-[#2EA3F2] animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Live Camera Capture
                </h3>
              </div>
              <button
                type="button"
                onClick={stopWebcam}
                className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {webcamError ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-amber-800 dark:text-amber-200 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <span>{webcamError}</span>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-950/70 text-white rounded-full text-[10px] font-medium backdrop-blur-xs">
                  Center your photo in frame
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={stopWebcam}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={captureSnapshot}
                className="px-5 py-2.5 rounded-xl bg-[#0A2E73] hover:bg-[#08245A] text-white font-bold text-xs flex items-center gap-2 shadow-lg"
              >
                <Camera className="w-4 h-4 text-[#2EA3F2]" />
                <span>Capture Photo Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
