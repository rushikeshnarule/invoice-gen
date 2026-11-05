// ─── Self-contained SVG QR Code Generator ───────────────────────────
// Generates standard compliant ISO/IEC 18004 SVG QR codes for UPI payments and URLs.
import QRCode from 'qrcode';

export function generateQRCodeSvg(data: string, size = 120): string {
  if (!data || typeof data !== 'string' || !data.trim()) {
    return '';
  }

  try {
    const qr = QRCode.create(data.trim(), { errorCorrectionLevel: 'M' });
    const moduleCount = qr.modules.size;
    // Standard ISO/IEC 18004 specifies a minimum 4-module quiet zone margin
    const margin = 4;
    const totalSize = moduleCount + margin * 2;

    // Build SVG path on integer coordinate grid to eliminate floating-point subpixel gaps and distortions
    let path = '';
    for (let r = 0; r < moduleCount; r++) {
      let startCol = -1;
      for (let c = 0; c < moduleCount; c++) {
        if (qr.modules.get(r, c)) {
          if (startCol === -1) startCol = c;
        } else if (startCol !== -1) {
          const w = c - startCol;
          path += `M${startCol + margin} ${r + margin}h${w}v1h-${w}z `;
          startCol = -1;
        }
      }
      if (startCol !== -1) {
        const w = moduleCount - startCol;
        path += `M${startCol + margin} ${r + margin}h${w}v1h-${w}z `;
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff" /><path fill="#000000" d="${path.trim()}" /></svg>`;
  } catch (err) {
    console.error('Failed to generate QR code SVG:', err);
    return '';
  }
}

export function QRCodeView({
  data,
  size = 110,
  className = '',
}: {
  data: string;
  size?: number;
  className?: string;
}) {
  if (!data || !data.trim()) return null;

  // If data is a base64 or URL image, render as image directly
  if (
    data.startsWith('data:image/') ||
    data.startsWith('blob:') ||
    data.startsWith('http://') ||
    data.startsWith('https://')
  ) {
    return (
      <img
        src={data}
        alt="Payment QR Code"
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          backgroundColor: '#ffffff',
          padding: '2px',
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
          display: 'inline-block',
        }}
      />
    );
  }

  const svg = generateQRCodeSvg(data, size);
  if (!svg) return null;

  return (
    <div
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: '#ffffff',
        padding: '2px',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
        lineHeight: 0,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
