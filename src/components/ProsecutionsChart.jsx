import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink:        '#1a1208',
  inkMuted:   '#5c5240',
  inkFaint:   '#9c8e7e',
  paper:      '#faf7f2',
  paperRule:  '#e8e0d0',
  accentBlue: '#1a4a7a',
  accentGreen:'#1a6b3a',
  amber:      '#b8860b',
  mono:       '"JetBrains Mono", monospace',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: COLORS.paper,
      border: `1px solid ${COLORS.paperRule}`,
      borderLeft: `3px solid ${COLORS.accentBlue}`,
      padding: '0.6rem 0.9rem',
      fontFamily: COLORS.mono,
      fontSize: "0.95rem",
      color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.4rem' }}>{label}</div>
      {payload.map(p => p.value != null && (
        <div key={p.dataKey} style={{ color: p.color ?? COLORS.inkMuted, marginBottom: '0.15rem' }}>
          {p.name}:{' '}
          {p.dataKey === 'conviction_rate'
            ? `${p.value.toFixed(1)}%`
            : p.value.toLocaleString()}
        </div>
      ))}
    </div>
  );
};

export default function ProsecutionsChart({ series }) {
  if (!series?.length) return (
    <p style={{ fontFamily: COLORS.mono, fontSize: "0.95rem", color: COLORS.inkFaint, padding: '1rem 0' }}>
      No prosecution data available.
    </p>
  );

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={series} margin={{ top: 8, right: 52, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
          />
          <YAxis
            yAxisId="count"
            orientation="left"
            tickFormatter={v => `${(v / 1e6).toFixed(1)}M`}
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            tickFormatter={v => `${v}%`}
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={[75, 90]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontFamily: COLORS.mono, fontSize: "0.9rem", paddingTop: '8px' }} />
          <Bar
            yAxisId="count"
            dataKey="prosecuted"
            name="Prosecuted"
            fill={COLORS.accentBlue}
            fillOpacity={0.5}
            maxBarSize={28}
            radius={[1, 1, 0, 0]}
          />
          <Bar
            yAxisId="count"
            dataKey="convicted"
            name="Convicted"
            fill={COLORS.accentGreen}
            fillOpacity={0.7}
            maxBarSize={28}
            radius={[1, 1, 0, 0]}
          />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="conviction_rate"
            name="Conviction rate %"
            stroke={COLORS.amber}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS.amber, strokeWidth: 0 }}
            activeDot={{ r: 4.5, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: "0.9rem", color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.25rem' }}>
        Source: MoJ Criminal Justice Statistics · All offences, England &amp; Wales · Magistrates' and Crown Court combined
      </p>
    </div>
  );
}
