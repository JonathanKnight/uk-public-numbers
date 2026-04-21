import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink: '#1a1208', inkMuted: '#5c5240', inkFaint: '#9c8e7e',
  paper: '#faf7f2', paperRule: '#e8e0d0',
  fees: '#b8860b', loans: '#c0392b', loansProj: '#e8a090',
  mono: '"JetBrains Mono", monospace',
};

function FeeTooltip({ active, payload, label }) {
  if (!active || !payload?.length || payload[0].value == null) return null;
  return (
    <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.paperRule}`, borderLeft: `3px solid ${COLORS.fees}`, padding: '0.6rem 0.9rem', fontFamily: COLORS.mono, fontSize: '0.9rem', color: COLORS.inkMuted }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ color: COLORS.fees }}>£{payload[0].value.toLocaleString()}/year</div>
      {payload[0].payload?.note && <div style={{ color: COLORS.inkFaint, fontSize: '0.8rem', marginTop: '0.2rem' }}>{payload[0].payload.note}</div>}
    </div>
  );
}

function LoanTooltip({ active, payload, label }) {
  if (!active || !payload?.length || payload[0].value == null) return null;
  const isProj = payload[0].payload?.is_projection;
  return (
    <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.paperRule}`, borderLeft: `3px solid ${COLORS.loans}`, padding: '0.6rem 0.9rem', fontFamily: COLORS.mono, fontSize: '0.9rem', color: COLORS.inkMuted }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}{isProj ? ' (projected)' : ''}</div>
      <div style={{ color: COLORS.loans }}>£{payload[0].value}bn outstanding</div>
    </div>
  );
}

function FeesChart({ series }) {
  const expanded = [];
  for (let i = 0; i < series.length; i++) {
    const cur  = series[i];
    const next = series[i + 1];
    const endYear = next ? parseInt(next.year.split('-')[0]) : parseInt(cur.year.split('-')[0]) + 3;
    const startYear = parseInt(cur.year.split('-')[0]);
    for (let y = startYear; y < endYear; y++) {
      expanded.push({ label: `${y}`, fee: cur.fee, note: startYear === y ? cur.note : undefined });
    }
  }

  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: COLORS.mono, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: COLORS.inkFaint, marginBottom: '0.75rem' }}>
        Annual fee cap for home undergraduates · England
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={expanded} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis dataKey="label" tick={{ fontFamily: COLORS.mono, fontSize: 11, fill: COLORS.inkFaint, angle: -45, textAnchor: 'end', dy: 4 }} tickLine={false} axisLine={{ stroke: COLORS.paperRule }} interval={3} height={45} />
          <YAxis tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint }} tickLine={false} axisLine={false} width={40} domain={[0, 11000]} />
          <Tooltip content={<FeeTooltip />} />
          <ReferenceLine y={9250} stroke={COLORS.inkFaint} strokeDasharray="3 3" label={{ value: '£9,250 freeze 2017–24', position: 'insideTopRight', fontFamily: COLORS.mono, fontSize: 10, fill: COLORS.inkFaint }} />
          <Line type="stepAfter" dataKey="fee" stroke={COLORS.fees} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function LoansChart({ series }) {
  const firstProj = series.find(d => d.is_projection);
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: COLORS.mono, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: COLORS.inkFaint, marginBottom: '0.75rem' }}>
        Student loans outstanding · £bn nominal · England
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={series} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis dataKey="year" tick={{ fontFamily: COLORS.mono, fontSize: 11, fill: COLORS.inkFaint, angle: -45, textAnchor: 'end', dy: 4 }} tickLine={false} axisLine={{ stroke: COLORS.paperRule }} interval={2} height={45} />
          <YAxis tickFormatter={v => `£${v}bn`} tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint }} tickLine={false} axisLine={false} width={56} domain={[0, 400]} />
          <Tooltip content={<LoanTooltip />} />
          {firstProj && <ReferenceLine x={firstProj.year} stroke={COLORS.inkFaint} strokeDasharray="3 3" label={{ value: 'projection →', position: 'insideTopLeft', fontFamily: COLORS.mono, fontSize: 11, fill: COLORS.inkFaint }} />}
          <Line type="monotone" dataKey="balance_bn" stroke={COLORS.loans} strokeWidth={2.5} dot={{ r: 2.5, fill: COLORS.loans, strokeWidth: 0 }} activeDot={{ r: 4 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.85rem', color: COLORS.inkFaint, marginTop: '0.25rem' }}>
        Student Loans Company / OBR · ~40% of new lending is estimated never to be repaid (OBR resource accounting)
      </p>
    </div>
  );
}

export default function TuitionFeesLoansChart({ feesSeries, loansSeries }) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
        <FeesChart series={feesSeries} />
        <LoansChart series={loansSeries} />
      </div>
    </div>
  );
}
