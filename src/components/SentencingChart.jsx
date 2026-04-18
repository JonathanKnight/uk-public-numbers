import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink:        '#1a1208',
  inkMuted:   '#5c5240',
  inkFaint:   '#9c8e7e',
  paper:      '#faf7f2',
  paperRule:  '#e8e0d0',
  accent:     '#c0392b',
  accentBlue: '#1a4a7a',
  mono:       '"JetBrains Mono", monospace',
};

function barColor(years) {
  if (years >= 5)  return '#c0392b';
  if (years >= 2.5) return '#d35400';
  if (years >= 1.5) return '#b8860b';
  if (years >= 1)  return '#1a4a7a';
  return '#5c7a9c';
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const years = payload[0]?.value;
  return (
    <div style={{
      background: COLORS.paper,
      border: `1px solid ${COLORS.paperRule}`,
      borderLeft: `3px solid ${COLORS.accent}`,
      padding: '0.6rem 0.9rem',
      fontFamily: COLORS.mono,
      fontSize: "0.95rem",
      color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      <div>{years?.toFixed(1)} years</div>
    </div>
  );
};

export default function SentencingChart({ byOffence }) {
  if (!byOffence?.length) return (
    <p style={{ fontFamily: COLORS.mono, fontSize: "0.95rem", color: COLORS.inkFaint, padding: '1rem 0' }}>
      No sentencing data available.
    </p>
  );

  const sorted = [...byOffence]
    .map(d => ({ ...d, years: parseFloat((d.months / 12).toFixed(1)) }))
    .sort((a, b) => b.years - a.years);

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          layout="vertical"
          data={sorted}
          margin={{ top: 4, right: 80, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={v => `${v}yr`}
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
          />
          <YAxis
            type="category"
            dataKey="offence"
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkMuted }}
            tickLine={false}
            axisLine={false}
            width={220}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: COLORS.paperRule, opacity: 0.4 }} />
          <Bar dataKey="years" name="Avg sentence (years)" maxBarSize={18} radius={[0, 2, 2, 0]}>
            {sorted.map(d => (
              <Cell key={d.offence} fill={barColor(d.years)} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: "0.9rem", color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.25rem' }}>
        Source: MoJ Criminal Justice Statistics 2024 · Average custodial sentence length, adults · Murder (mandatory life) excluded · Manslaughter shown separately
      </p>
    </div>
  );
}
