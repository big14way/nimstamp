import QRCode from 'qrcode';

/** A5 at 150 dpi ≈ 874 × 1240 px. Generated client-side; returns a PNG data URL. */
export async function renderTableTent(o: { name: string; headline: string; rewardLine: string; scanLine: string; orLine: string; url: string; deepLink: string }): Promise<string> {
  const W = 874;
  const H = 1240;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#F6B221';
  ctx.fillRect(0, 0, W, 24);
  ctx.fillRect(0, H - 24, W, 24);

  const font = (px: number, weight = 700) => `${weight} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const wrap = (text: string, maxW: number, px: number, weight: number, y: number, lineH: number, color = '#1F2348'): number => {
    ctx.font = font(px, weight);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    const words = text.split(' ');
    let line = '';
    const lines: string[] = [];
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    for (const l of lines) {
      ctx.fillText(l, W / 2, y);
      y += lineH;
    }
    return y;
  };

  let y = 130;
  y = wrap(o.name, W - 120, 64, 800, y, 72);
  y = wrap(o.headline, W - 140, 38, 600, y + 20, 48, '#5C5F7A');
  y = wrap(o.rewardLine, W - 140, 34, 700, y + 16, 44);

  const qrSize = 460;
  const qr = await QRCode.toDataURL(o.deepLink, { width: qrSize, margin: 1, color: { dark: '#1F2348', light: '#FFFFFF' } });
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const x = (W - qrSize) / 2;
      const qy = Math.max(y + 24, 470);
      ctx.strokeStyle = '#E8E3D6';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x - 20, qy - 20, qrSize + 40, qrSize + 40, 28);
      ctx.stroke();
      ctx.drawImage(img, x, qy, qrSize, qrSize);
      y = qy + qrSize + 70;
      resolve();
    };
    img.src = qr;
  });

  y = wrap(o.scanLine, W - 140, 34, 700, y, 44);
  y = wrap(`${o.orLine} ${o.url.replace(/^https?:\/\//, '')}`, W - 120, 26, 500, y + 6, 34, '#5C5F7A');
  ctx.font = font(24, 600);
  ctx.fillStyle = '#5C5F7A';
  ctx.fillText('NimStamp · runs inside Nimiq Pay', W / 2, H - 70);
  return c.toDataURL('image/png');
}
