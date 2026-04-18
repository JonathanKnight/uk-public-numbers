import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = {
  ink:        '#1a1208',
  inkMuted:   '#5c5240',
  inkFaint:   '#9c8e7e',
  paper:      '#faf7f2',
  paperRule:  '#e8e0d0',
  accentBlue: '#1a4a7a',
  accentGreen:'#1a6b3a',
  mono:       '"JetBrains Mono", monospace',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: COLORS.paper,
      border: `1px solid ${COLORS.paperRule}`,
      borderLeft: `3px solid ${COLORS.accentBlue}`,
      padding: '0.6rem 0.8rem',
      fontFamily: COLORS.mono,
      fontSize: '0.7rem',
      color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.4rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '0.15rem' }}>
          {p.name}: {p.value.toLocaleString()}
        </div>
      ))}
    </div>
  );
};

export default function WorkforceChart({ series }) {
  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={series} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontFamily: COLORS.mono, fontSize: 9.5, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
            interval={2}
          />
          <YAxis
            tick={{ fontFamily: COLORS.mono, fontSize: 10, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontFamily: COLORS.mono, fontSize: '0.65rem', paddingTop: '8px' }}
          />
          <Line
            type="monotone"
            dataKey="doctors"
            name="HCHS Doctors"
            stroke={COLORS.accentBlue}
            strokeWidth={2}
            dot={{ r: 2.5, fill: COLORS.accentBlue, strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="nurses"
            name="Nurses & Health Visitors"
            stroke={COLORS.accentGreen}
            strokeWidth={2}
            dot={{ r: 2.5, fill: COLORS.accentGreen, strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p style={{
        fontFamily: COLORS.mono, fontSize: '0.65rem', color: COLORS.inkFaint,
        letterSpacing: '0.04em', marginTop: '0.25rem',
      }}>
        Source: NHS Workforce Statistics, NHS England · September headcount snapshot each year
      </p>
    </div>
  );
}
