import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, LabelList, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink: '#1a1208', inkMuted: '#5c5240', inkFaint: '#9c8e7e',
  paper: '#faf7f2', paperRule: '#e8e0d0',
  accent: '#1a4a7a', top10: '#c0392b',
  mono: '"JetBrains Mono", monospace',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.paperRule}`, borderLeft: `3px solid ${COLORS.accent}`, padding: '0.6rem 0.9rem', fontFamily: COLORS.mono, fontSize: '0.9rem', color: COLORS.inkMuted }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ color: COLORS.accent }}>Global rank: #{payload[0].value}</div>
    </div>
  );
};

export default function UniversityRankingsChart({ rankings }) {
  if (!rankings?.length) return null;
  const sorted = [...rankings].sort((a, b) => a.rank - b.rank);

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart layout="vertical" data={sorted} margin={{ top: 4, right: 70, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} horizontal={false} />
          <XAxis type="number" reversed tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint }} tickLine={false} axisLine={{ stroke: COLORS.paperRule }} domain={[0, 110]} />
          <YAxis type="category" dataKey="university" tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkMuted }} tickLine={false} axisLine={false} width={190} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: COLORS.paperRule, opacity: 0.4 }} />
          <Bar dataKey="rank" maxBarSize={18} radius={[2, 0, 0, 2]}>
            {sorted.map(d => (
              <Cell key={d.university} fill={d.rank <= 10 ? COLORS.top10 : COLORS.accent} fillOpacity={0.8} />
            ))}
            <LabelList
              dataKey="rank"
              position="right"
              formatter={v => `#${v}`}
              style={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkMuted }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.85rem', color: COLORS.inkFaint, marginTop: '0.25rem' }}>
        QS World University Rankings 2025 · global rank out of ~1,500 institutions · red = top 10 globally · bars extend left (lower rank = better)
      </p>
    </div>
  );
}
