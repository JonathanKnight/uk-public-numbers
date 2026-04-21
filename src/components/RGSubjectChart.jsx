import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, LabelList, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink: '#1a1208', inkMuted: '#5c5240', inkFaint: '#9c8e7e',
  paper: '#faf7f2', paperRule: '#e8e0d0',
  domestic: '#1a4a7a', international: '#c0392b',
  mono: '"JetBrains Mono", monospace',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const dom  = payload.find(p => p.dataKey === 'domestic');
  const intl = payload.find(p => p.dataKey === 'international');
  const total = (dom?.value ?? 0) + (intl?.value ?? 0);
  const intlPct = total ? Math.round((intl?.value ?? 0) / total * 100) : 0;
  return (
    <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.paperRule}`, borderLeft: `3px solid ${COLORS.inkFaint}`, padding: '0.6rem 0.9rem', fontFamily: COLORS.mono, fontSize: '0.9rem', color: COLORS.inkMuted }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      {dom  && <div style={{ color: COLORS.domestic }}>Domestic (UK): {dom.value.toLocaleString()}</div>}
      {intl && <div style={{ color: COLORS.international }}>International: {intl.value.toLocaleString()} ({intlPct}%)</div>}
      <div style={{ color: COLORS.inkMuted, borderTop: `1px solid ${COLORS.paperRule}`, marginTop: '0.3rem', paddingTop: '0.3rem' }}>Total: {total.toLocaleString()}</div>
    </div>
  );
};

export default function RGSubjectChart({ bySubject, snapshotYear }) {
  if (!bySubject?.length) return null;
  const sorted = [...bySubject].sort((a, b) => (b.domestic + b.international) - (a.domestic + a.international));

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart layout="vertical" data={sorted} margin={{ top: 4, right: 90, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} horizontal={false} />
          <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint }} tickLine={false} axisLine={{ stroke: COLORS.paperRule }} />
          <YAxis type="category" dataKey="subject" tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkMuted }} tickLine={false} axisLine={false} width={135} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: COLORS.paperRule, opacity: 0.4 }} />
          <Bar dataKey="domestic"      name="Domestic (UK)"  stackId="a" fill={COLORS.domestic}      fillOpacity={0.8} maxBarSize={24} />
          <Bar dataKey="international" name="International"  stackId="a" fill={COLORS.international} fillOpacity={0.8} maxBarSize={24} radius={[0, 3, 3, 0]}>
            <LabelList
              content={({ x, y, width, height, index }) => {
                const d = sorted[index];
                const total = d.domestic + d.international;
                const pct = Math.round(d.international / total * 100);
                return (
                  <text x={x + width + 6} y={y + height / 2 + 4}
                    fontFamily={COLORS.mono} fontSize={12} fill={COLORS.inkFaint}>
                    {pct}% intl
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.85rem', color: COLORS.inkFaint, marginTop: '0.25rem' }}>
        Undergraduate students at 24 Russell Group universities · {snapshotYear} · estimated from HESA HECOS provider-level data · blue = UK domicile · red = international (incl. EU)
      </p>
    </div>
  );
}
