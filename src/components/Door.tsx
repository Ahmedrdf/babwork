// The studded door of Sidi Bou Saïd, drawn for Babwork. Studs are laid out once at module load.
const studs: [number, number, number][] = [];
for (let a = 180; a <= 360; a += 20) { const t = (a * Math.PI) / 180; studs.push([110 + 62 * Math.cos(t), 130 + 62 * Math.sin(t), 3.2]); }
for (let y = 152; y <= 292; y += 20) studs.push([48, y, 3.2], [172, y, 3.2]);
studs.push([110, 190, 4.5]);
for (let a = 0; a < 360; a += 45) {
  const t = (a * Math.PI) / 180;
  studs.push([110 + 20 * Math.cos(t), 190 + 20 * Math.sin(t), 3.2], [110 + 40 * Math.cos(t), 190 + 40 * Math.sin(t), 2.6]);
}
for (let x = 70; x <= 150; x += 20) studs.push([x, 272, 3.2]);

export function Door({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 312" aria-hidden="true" focusable="false">
      <rect x="8" y="300" width="204" height="12" rx="2" fill="#e7dfcf" />
      <path d="M18 312V128a92 92 0 0 1 184 0v184z" fill="#d9a441" />
      <path d="M34 312V130a76 76 0 0 1 152 0v182z" fill="#1f5fae" />
      <path d="M44 312V130a66 66 0 0 1 132 0v182" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".45" />
      <g fill="#fff">{studs.map(([x, y, r], i) => <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={r} />)}</g>
      <circle cx="128" cy="244" r="6" fill="none" stroke="#f3d27a" strokeWidth="2" />
      <ellipse cx="47" cy="62" rx="8" ry="4" fill="#2f7d4f" transform="rotate(-35 47 62)" />
      <ellipse cx="62" cy="44" rx="7" ry="3.5" fill="#2f7d4f" transform="rotate(-50 62 44)" />
      <ellipse cx="17" cy="96" rx="7" ry="3.5" fill="#2f7d4f" transform="rotate(-70 17 96)" />
      <circle cx="26" cy="66" r="9" fill="#d6336c" /><circle cx="40" cy="52" r="8" fill="#e8578b" /><circle cx="53" cy="38" r="7" fill="#d6336c" />
      <circle cx="19" cy="84" r="7" fill="#e8578b" /><circle cx="66" cy="30" r="6" fill="#e8578b" /><circle cx="34" cy="74" r="6" fill="#c2255c" />
    </svg>
  );
}
