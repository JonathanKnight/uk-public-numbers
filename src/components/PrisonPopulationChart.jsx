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
  accent:     '#c0392b',
  accentBlue: '#1a4a7a',
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
          {p.dataKey === 'avg_sentence'
            ? `${p.value} months avg`
            : p.value.toLocaleString() + ' prisoners'}
        </div>
      ))}
    </div>
  );
};

export default function PrisonPopulationChart({ populationSeries, sentencingTrend }) {
  if (!populationSeries?.length) return (
    <p style={{ fontFamily: COLORS.mono, fontSize: "0.95rem", color: COLORS.inkFaint, padding: '1rem 0' }}>
      No prison population data available.
    </p>
  );

  // Join sentencing trend by year
  const sentByYear = {};
  for (const s of (sentencingTrend ?? [])) sentByYear[s.period] = s.all_offences;

  const data = populationSeries.map(d => ({
    period: d.period,
    population: d.population,
    avg_sentence: sentByYear[d.period] ?? null,
  }));

  const hasSentencing = data.some(d => d.avg_sentence != null);

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: hasSentencing ? 52 : 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
            interval={2}
          />
          <YAxis
            yAxisId="pop"
            orientation="left"
            tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={40}
            domain={[60000, 95000]}
          />
          {hasSentencing && (
            <YAxis
              yAxisId="sent"
              orientation="right"
              tickFormatter={v => `${v}mo`}
              tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={[12, 26]}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontFamily: COLORS.mono, fontSize: "0.9rem", paddingTop: '8px' }} />
          <Bar
            yAxisId="pop"
            dataKey="population"
            name="Prison population"
            fill={COLORS.accentBlue}
            fillOpacity={0.65}
            maxBarSize={22}
            radius={[1, 1, 0, 0]}
          />
          {hasSentencing && (
            <Line
              yAxisId="sent"
              type="monotone"
              dataKey="avg_sentence"
              name="Avg sentence (months)"
              stroke={COLORS.amber}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS.amber, strokeWidth: 0 }}
              activeDot={{ r: 4.5, strokeWidth: 0 }}
              connectNulls={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: "0.9rem", color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.25rem' }}>
        Source: MoJ Offender Management Statistics · Average prison population (sentenced + remand) · England &amp; Wales
      </p>
    </div>
  );
}
