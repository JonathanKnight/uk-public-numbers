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

// Colour scale by sentence length — longer = darker red
function barColor(months) {
  if (months >= 60) return '#c0392b';
  if (months >= 30) return '#d35400';
  if (months >= 18) return '#b8860b';
  if (months >= 12) return '#1a4a7a';
  return '#5c7a9c';
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const months = payload[0]?.value;
  const years = months != null ? (months / 12).toFixed(1) : null;
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
      <div>{months} months</div>
      <div style={{ color: COLORS.inkFaint, fontSize: "0.9rem" }}>{years} years</div>
    </div>
  );
};

export default function SentencingChart({ byOffence }) {
  if (!byOffence?.length) return (
    <p style={{ fontFamily: COLORS.mono, fontSize: "0.95rem", color: COLORS.inkFaint, padding: '1rem 0' }}>
      No sentencing data available.
    </p>
  );

  // Sort longest first
  const sorted = [...byOffence].sort((a, b) => b.months - a.months);

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
            tickFormatter={v => `${v}mo`}
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
            width={170}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: COLORS.paperRule, opacity: 0.4 }} />
          <Bar dataKey="months" name="Avg sentence (months)" maxBarSize={18} radius={[0, 2, 2, 0]}>
            {sorted.map(d => (
              <Cell key={d.offence} fill={barColor(d.months)} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: "0.9rem", color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.25rem' }}>
        Source: MoJ Criminal Justice Statistics 2024 · Average custodial sentence length, adults · Excludes life/indeterminate sentences
      </p>
    </div>
  );
}
