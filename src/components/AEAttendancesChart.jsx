import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = {
  ink:      '#1a1208',
  inkMuted: '#5c5240',
  inkFaint: '#9c8e7e',
  paper:    '#faf7f2',
  paperRule:'#e8e0d0',
  accent:   '#c0392b',
  accentBlue: '#1a4a7a',
  mono:     '"JetBrains Mono", monospace',
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
      fontSize: "0.95rem",
      color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.25rem' }}>{label}</div>
      <div>{payload[0].value}M attendances</div>
    </div>
  );
};

export default function AEAttendancesChart({ series }) {
  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={series} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
            interval={1}
            angle={-35}
            textAnchor="end"
            height={40}
          />
          <YAxis
            domain={[0, 35]}
            ticks={[0, 5, 10, 15, 20, 25, 30, 35]}
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}M`}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Mark COVID year */}
          <ReferenceLine x="2020/21" stroke={COLORS.accent} strokeDasharray="3 3" strokeWidth={1} />
          <Bar dataKey="value" radius={[1, 1, 0, 0]}>
            {series.map(entry => (
              <Cell
                key={entry.period}
                fill={entry.period === '2020/21' ? COLORS.accent : COLORS.accentBlue}
                fillOpacity={entry.period === '2020/21' ? 0.6 : 0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={{
        fontFamily: COLORS.mono, fontSize: "0.9rem", color: COLORS.inkFaint,
        letterSpacing: '0.04em', marginTop: '0.25rem',
      }}>
        Source: NHS England A&amp;E Attendances and Emergency Admissions time series · Red bar = COVID-19 year
      </p>
    </div>
  );
}
