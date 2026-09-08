import QRCode from 'qrcode';

/** A5 at 150 dpi ≈ 874 × 1240 px. Generated client-side; returns a PNG data URL. */
export async function renderTableTent(o: { name: string; headline: string; rewardLine: string; scanLine: string; orLine: string; url: string; deepLink: string }): Promise<string> {
  const W = 874;
  const H = 1240;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const PANEL = '#3b46c4';
  const INK = '#1c2140';
  const SOFT = '#5b607f';
  try {
    await Promise.all([document.fonts.load('800 64px "Barlow Semi Condensed"'), document.fonts.load('700 32px Barlow'), document.fonts.load('500 24px Barlow')]);
  } catch {
    /* fall back to the system stack */
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  // ultramarine header band with a perforated edge
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, W, 330);
  ctx.fillStyle = '#FFFFFF';
  for (let x = 12; x < W; x += 24) ctx.fillRect(x, 322, 12, 8);
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, H - 18, W, 18);

  const font = (px: number, weight = 700) => (weight >= 800 ? `800 ${px}px "Barlow Semi Condensed", "Arial Narrow", Arial, sans-serif` : `${weight} ${px}px Barlow, "Helvetica Neue", Arial, sans-serif`);
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

  let y = 150;
  y = wrap(o.name.toUpperCase(), W - 100, 84, 800, y, 84, '#FFFFFF');
  y = wrap(o.headline, W - 140, 34, 700, Math.max(y + 10, 250), 42, '#d5d9f5');
  y = wrap(o.rewardLine, W - 140, 36, 700, 390, 46, INK);

  const qrSize = 460;
  const qr = await QRCode.toDataURL(o.deepLink, { width: qrSize, margin: 1, color: { dark: INK, light: '#FFFFFF' } });
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const x = (W - qrSize) / 2;
      const qy = Math.max(y + 16, 440);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 20, qy - 20, qrSize + 40, qrSize + 40);
      ctx.drawImage(img, x, qy, qrSize, qrSize);
      y = qy + qrSize + 70;
      resolve();
    };
    img.src = qr;
  });

  y = wrap(o.scanLine.toUpperCase(), W - 140, 40, 800, y, 46, INK);
  y = wrap(`${o.orLine} ${o.url.replace(/^https?:\/\//, '')}`, W - 120, 26, 500, y + 4, 34, SOFT);
  ctx.font = font(22, 700);
  ctx.fillStyle = SOFT;
  ctx.fillText('NIMSTAMP · RUNS INSIDE NIMIQ PAY', W / 2, H - 60);
  return c.toDataURL('image/png');
}
