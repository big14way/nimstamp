import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';

export function QrCode({ value, size = 220, className = '' }: { value: string; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) void QRCode.toCanvas(ref.current, value, { width: size, margin: 1, color: { dark: '#1c2140', light: '#FFFFFF' } });
  }, [value, size]);
  return <canvas ref={ref} width={size} height={size} className={`rounded-xl ${className}`} aria-label={value} />;
}
