import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink: '#1a1208', inkMuted: '#5c5240', inkFaint: '#9c8e7e',
  paper: '#faf7f2', paperRule: '#e8e0d0',
  funding: '#1a4a7a', teachers: '#c0392b',
  mono: '"JetBrains Mono", monospace',
};

function makeTooltip(color, fmt) {
  return ({ active, payload, label }) => {
    if (!active || !payload?.length || payload[0].value == null) return null;
    return (
      <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.paperRule}`, borderLeft: `3px solid ${color}`, padding: '0.6rem 0.9rem', fontFamily: COLORS.mono, fontSize: '0.9rem', color: COLORS.inkMuted }}>
        <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
        <div style={{ color }}>{fmt(payload[0].value)}</div>
      </div>
    );
  };
}

const FundingTooltip = makeTooltip(COLORS.funding, v => `£${v.toLocaleString()} per pupil`);
const TeacherTooltip = makeTooltip(COLORS.teachers, v => `${(v / 1000).toFixed(1)}k FTE`);

function FundingChart({ data }) {
  const trough = data.find(d => d.per_pupil_real === Math.min(...data.map(d => d.per_pupil_real)));
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: COLORS.mono, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: COLORS.inkFaint, marginBottom: '0.75rem' }}>
        Spending per pupil · 2023–24 prices (inflation-adjusted)
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis dataKey="year" tick={{ fontFamily: COLORS.mono, fontSize: 11, fill: COLORS.inkFaint, angle: -45, textAnchor: 'end', dy: 4 }} tickLine={false} axisLine={{ stroke: COLORS.paperRule }} height={45} />
          <YAxis tickFormatter={v => `£${(v / 1000).toFixed(1)}k`} tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint }} tickLine={false} axisLine={false} width={48} domain={[6200, 7500]} />
          <Tooltip content={<FundingTooltip />} />
          {trough && <ReferenceLine x={trough.year} stroke={COLORS.inkFaint} strokeDasharray="3 3" label={{ value: 'trough', position: 'insideTopRight', fontFamily: COLORS.mono, fontSize: 11, fill: COLORS.inkFaint }} />}
          <Line type="monotone" dataKey="per_pupil_real" stroke={COLORS.funding} strokeWidth={2.5} dot={{ r: 2.5, fill: COLORS.funding, strokeWidth: 0 }} activeDot={{ r: 4 }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.85rem', color: COLORS.inkFaint, marginTop: '0.25rem' }}>
        IFS analysis of DfE / PESA data · primary and secondary state schools · England
      </p>
    </div>
  );
}

function TeachersChart({ data }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: COLORS.mono, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: COLORS.inkFaint, marginBottom: '0.75rem' }}>
        Teacher headcount (FTE) · state-funded schools
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis dataKey="year" tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint, angle: -45, textAnchor: 'end', dy: 4 }} tickLine={false} axisLine={{ stroke: COLORS.paperRule }} height={45} interval={2} />
          <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint }} tickLine={false} axisLine={false} width={44} domain={[440000, 480000]} />
          <Tooltip content={<TeacherTooltip />} />
          <Line type="monotone" dataKey="fte" stroke={COLORS.teachers} strokeWidth={2.5} dot={{ r: 2.5, fill: COLORS.teachers, strokeWidth: 0 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.85rem', color: COLORS.inkFaint, marginTop: '0.25rem' }}>
        DfE School Workforce census · November each year · {data[data.length - 1]?.pct_qts}% hold Qualified Teacher Status (QTS)
      </p>
    </div>
  );
}

export default function SchoolResourcesChart({ fundingSeries, teacherSeries }) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
        <FundingChart data={fundingSeries} />
        <TeachersChart data={teacherSeries} />
      </div>
    </div>
  );
}
