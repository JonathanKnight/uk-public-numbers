import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

const COLORS = {
  ink:        '#1a1208',
  inkMuted:   '#5c5240',
  inkFaint:   '#9c8e7e',
  paper:      '#faf7f2',
  paperRule:  '#e8e0d0',
  accent:     '#c0392b',
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
      fontSize: '0.8rem',
      color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.4rem' }}>{label}</div>
      {payload.map(p => p.value != null && (
        <div key={p.dataKey} style={{ color: p.color ?? COLORS.inkMuted, marginBottom: '0.15rem' }}>
          {p.name}: {(p.value / 1e6).toFixed(2)}M
        </div>
      ))}
    </div>
  );
};

export default function HospitalActivityChart({ series }) {
  const hasProcData = series?.some(d => d.fce_with_procedure != null);

  if (!series?.length) return (
    <p style={{ fontFamily: COLORS.mono, fontSize: '0.8rem', color: COLORS.inkFaint, padding: '1rem 0' }}>
      No data. Run <code>node scripts/fetch-hospital-activity.js</code> to populate.
    </p>
  );

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={series} margin={{ top: 8, right: hasProcData ? 48 : 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontFamily: COLORS.mono, fontSize: 11, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
            interval={2}
          />
          {/* Left axis: FCE counts */}
          <YAxis
            yAxisId="fce"
            orientation="left"
            tickFormatter={v => `${(v / 1e6).toFixed(0)}M`}
            tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          {hasProcData && (
            <YAxis
              yAxisId="proc"
              orientation="right"
              tickFormatter={v => `${(v / 1e6).toFixed(0)}M`}
              tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontFamily: COLORS.mono, fontSize: '0.75rem', paddingTop: '8px' }} />
          <Bar
            yAxisId="fce"
            dataKey="total_fce"
            name="Total FCEs"
            maxBarSize={28}
            radius={[1, 1, 0, 0]}
          >
            {series.map(d => (
              <Cell
                key={d.period}
                fill={d.period === '2020/21' ? COLORS.accent : COLORS.accentBlue}
                fillOpacity={d.period === '2020/21' ? 0.6 : 0.7}
              />
            ))}
          </Bar>
          {series.some(d => d.fce_with_procedure != null) && (
            <Line
              yAxisId="proc"
              type="monotone"
              dataKey="fce_with_procedure"
              name="FCEs with procedure"
              stroke={COLORS.accentGreen}
              strokeWidth={2}
              dot={{ r: 2.5, fill: COLORS.accentGreen, strokeWidth: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.75rem', color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.25rem' }}>
        Source: NHS Digital Hospital Episode Statistics (HES) · FCE = Finished Consultant Episode · Red bar = COVID-19 year
      </p>
    </div>
  );
}
