import React, { useState, useRef, useEffect } from 'react';
import {
  RiUpload2Line,
  RiDeleteBinLine,
  RiRefreshLine,
  RiCheckLine,
  RiPencilLine,
  RiImageLine,
} from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Chip } from '@/components/base/badges/chip';
import { FileUpload } from '@/components/base/file-upload/file-upload';

interface ImageUploadProps {
  label: string;
  description: string;
  value?: string;
  onChange: (value?: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
  accept?: string;
  maxDimension?: number;
  aspectHint?: string;
  allowDraw?: boolean;
  className?: string;
}

/**
 * Resizes and compresses image files client-side to prevent localStorage quota exhaustion
 * while keeping 300 DPI clarity for print PDFs.
 */
export async function fileToDataUrl(file: File, maxDimension = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    // Keep SVG vector intact
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
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
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const isPng = file.type === 'image/png' || file.type.includes('png');
        const outputMime = isPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputMime, isPng ? undefined : 0.88);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const ImageUploadCard: React.FC<ImageUploadProps> = ({
  label,
  description,
  value,
  onChange,
  icon: IconComponent = RiImageLine,
  accept = 'image/png,image/jpeg,image/jpg,image/webp,image/svg+xml',
  maxDimension = 800,
  aspectHint = 'PNG, JPG, or SVG up to 5MB',
  allowDraw = false,
  className = '',
}) => {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drawing Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPaintingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, SVG, or WEBP)');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file, maxDimension);
      onChange(dataUrl);
    } catch (err) {
      console.error('Failed to process image:', err);
      alert('Failed to process the uploaded image.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
      e.target.value = '';
    }
  };

  // Drawing Canvas logic
  useEffect(() => {
    if (!isDrawingMode || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isDrawingMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isPaintingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPaintingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isPaintingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
    setIsDrawingMode(false);
  };

  return (
    <div className={`p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <IconComponent className="size-4" />
          </div>
          <div>
            <span className="font-bold text-xs text-slate-900 block leading-tight">{label}</span>
            <span className="text-[10px] text-slate-500 block leading-tight">{description}</span>
          </div>
        </div>

        {/* Action Toggle for Drawing */}
        {allowDraw && !isDrawingMode && (
          <button
            type="button"
            onClick={() => {
              setIsDrawingMode(true);
              setHasDrawn(false);
            }}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RiPencilLine className="size-3" />
            Draw
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* DRAWING SIGNATURE MODE */}
      {isDrawingMode ? (
        <div className="space-y-2">
          <div className="relative border border-slate-300 rounded-xl bg-white overflow-hidden shadow-2xs touch-none">
            <canvas
              ref={canvasRef}
              width={400}
              height={140}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-28 bg-white cursor-crosshair block"
            />
            <div className="absolute inset-x-6 bottom-4 border-b border-dashed border-slate-200 pointer-events-none" />
            <span className="absolute bottom-1 right-2 text-[10px] text-slate-400 select-none pointer-events-none">
              Sign above using mouse or touch
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={clearCanvas}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RiRefreshLine className="size-3.5" />
              Clear
            </button>
            <div className="flex items-center gap-1.5">
              <Button
                size="xs"
                variant="secondary"
                onClick={() => setIsDrawingMode(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="xs"
                variant="primary"
                leadingIcon={RiCheckLine}
                onClick={saveCanvasSignature}
                disabled={!hasDrawn}
                className="text-xs"
              >
                Apply Signature
              </Button>
            </div>
          </div>
        </div>
      ) : value ? (
        /* IMAGE PREVIEW ACTIVE (Board UI Surface) */
        <div className="flex items-center gap-3 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/90">
          <div className="size-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
            <img
              src={value}
              alt={label}
              className="max-h-full max-w-full object-contain p-1"
            />
          </div>

          <div className="flex-1 min-w-0">
            <Chip color="lime" variant="caption" className="mb-1">
              Active in Invoice
            </Chip>
            <span className="text-[11px] text-slate-500 block truncate">
              {aspectHint}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="xs"
              variant="secondary"
              leadingIcon={RiUpload2Line}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
              title="Replace image"
            >
              Replace
            </Button>
            <Button
              size="xs"
              variant="ghost"
              leadingIcon={RiDeleteBinLine}
              onClick={() => onChange(undefined)}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
              title="Remove image"
            />
          </div>
        </div>
      ) : (
        /* OFFICIAL BOARD UI DRAG-AND-DROP FILE UPLOAD */
        <FileUpload
          onUploadComplete={handleProcessFile}
          allowedExtensions={["png", "jpg", "jpeg", "webp", "svg"]}
          maxBytes={5 * 1024 * 1024}
          className="h-[140px]"
        />
      )}
    </div>
  );
};
