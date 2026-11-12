import { useState } from 'react';

export const PALETTE = ['#c9a227', '#1f1b14', '#8a6a1c', '#2f5f8a', '#2f7d4f', '#b4423a', '#ecd27e', '#6d6656', '#a8701a', '#5b4a8a'];

/** Grafik batang vertikal sederhana (SVG) dengan tooltip. */
export function BarChart({ data, height = 200, valueLabel = 'pendaftar' }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 640, H = height, pad = { l: 30, r: 8, t: 14, b: 26 };
  const bw = (W - pad.l - pad.r) / data.length;
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Grafik pendaftar harian">
        {ticks.map((t) => {
          const y = pad.t + (H - pad.t - pad.b) * (1 - t / max);
          return <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#ece4d0" /><text x={pad.l - 6} y={y + 4} fontSize="10" textAnchor="end" fill="#8f8670">{t}</text></g>;
        })}
        {data.map((d, i) => {
          const h = ((H - pad.t - pad.b) * d.value) / max;
          const x = pad.l + i * bw + bw * 0.18;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              <rect x={x} y={H - pad.b - h} width={bw * 0.64} height={Math.max(h, d.value ? 2 : 0)} rx="3" fill={hover === i ? '#8a6a1c' : '#c9a227'} />
              {(i % Math.ceil(data.length / 8) === 0 || i === data.length - 1) && <text x={x + bw * 0.32} y={H - 8} fontSize="10" textAnchor="middle" fill="#8f8670">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div style={{ position: 'absolute', top: 0, left: `${((pad.l + hover * bw + bw / 2) / W) * 100}%`, transform: 'translate(-50%,-100%)', background: '#0c0b09', color: '#f3ead2', padding: '5px 10px', borderRadius: 8, fontSize: 12, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {data[hover].full || data[hover].label}: <b>{data[hover].value}</b> {valueLabel}
        </div>
      )}
    </div>
  );
}

/** Donat dengan legenda. */
export function Donut({ data, size = 170, center }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 60, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="row wrap" style={{ gap: 22, alignItems: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label="Diagram donat">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#f0e8d4" strokeWidth="22" />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = <circle key={i} cx="80" cy="80" r={r} fill="none" stroke={d.color || PALETTE[i % PALETTE.length]} strokeWidth="22"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} transform="rotate(-90 80 80)"><title>{`${d.label}: ${d.value}`}</title></circle>;
          acc += len; return el;
        })}
        <text x="80" y="78" textAnchor="middle" fontSize="26" fontWeight="800" fill="#1c1a15">{center ?? total}</text>
        <text x="80" y="98" textAnchor="middle" fontSize="11" fill="#8f8670">total</text>
      </svg>
      <div className="stack" style={{ gap: 7, flex: 1, minWidth: 140 }}>
        {data.map((d, i) => (
          <div key={i} className="row between small" style={{ gap: 8 }}>
            <span className="row" style={{ gap: 8 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: d.color || PALETTE[i % PALETTE.length], display: 'inline-block' }} />{d.label}</span>
            <b>{d.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return data.map((d) => (
    <div className="bar-h" key={d.label}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
      <div className="track"><span style={{ width: `${(d.value / max) * 100}%` }} /></div>
      <b style={{ textAlign: 'right' }}>{d.value}</b>
    </div>
  ));
}
