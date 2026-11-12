import { Link } from 'react-router-dom';
import { STEPS, STATUS } from '../../shared/constants.js';
import { Check, X } from 'lucide-react';

export function Brand({ dark, to = '/' }) {
  return (
    <Link to={to} className={`brand ${dark ? 'dark' : ''}`} aria-label="Kuttab Imam Al-Ghazali — Beranda">
      <img src="/brand/emblem.png" alt="" />
      <div><div className="t1">KUTTAB</div><div className="t2">IMAM AL-GHAZALI</div></div>
    </Link>
  );
}

/** Peta status → indeks langkah pada STEPS */
export function stepIndex(status) {
  switch (status) {
    case 'draft': return 0;
    case 'waiting_payment': return 1;
    case 'verification': case 'revision': return 2;
    case 'scheduled': return 3;
    case 'assessed': return 5;
    case 'reserve': case 'rejected': return 5;
    case 'accepted': return 6;
    case 'reregistration': return 6;
    case 'enrolled': return 8;
    default: return 0;
  }
}

export function StatusStepper({ status }) {
  const cur = stepIndex(status);
  const fail = ['rejected', 'cancelled'].includes(status);
  return (
    <div className="stepper">
      {STEPS.map((s, i) => {
        const done = i < cur, current = i === cur;
        const isFail = fail && (status === 'rejected' ? i === 5 : i === cur);
        return (
          <div key={s.key} className={`st ${done ? 'done' : ''} ${current ? 'current' : ''} ${isFail ? 'fail' : ''}`}>
            <div className="c">{isFail ? <X size={15} /> : done ? <Check size={15} /> : i + 1}</div>
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

export const statusDesc = (s) => STATUS[s]?.desc || '';
