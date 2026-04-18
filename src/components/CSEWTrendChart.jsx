import {
  ComposedChart, Line, Bar, XAxis, YAxis,
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
          {p.dataKey === 'incidents'
            ? `${p.value.toFixed(1)}M incidents`
            : p.value.toLocaleString() + ' officers'}
        </div>
      ))}
    </div>
  );
};

export default function CSEWTrendChart({ csewSeries, policeSeries }) {
  if (!csewSeries?.length) return (
    <p style={{ fontFamily: COLORS.mono, fontSize: "0.95rem", color: COLORS.inkFaint, padding: '1rem 0' }}>
      No CSEW data available.
    </p>
  );

  // Build a combined dataset keyed by approximate year
  // CSEW uses "YYYY/YY", police uses "Mar YYYY" — align by start year
  const policeByYear = {};
  for (const p of (policeSeries ?? [])) {
    const yr = parseInt(p.period.replace('Mar ', ''), 10);
    policeByYear[yr] = p.headcount;
  }

  const data = csewSeries.map(d => {
    const startYear = parseInt(d.period.split('/')[0], 10);
    return {
      period: d.period,
      incidents: d.incidents,
      officers: policeByYear[startYear] ?? null,
    };
  });

  const hasPolice = data.some(d => d.officers != null);

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: hasPolice ? 52 : 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
            interval={3}
          />
          <YAxis
            yAxisId="csew"
            orientation="left"
            tickFormatter={v => `${v}M`}
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={36}
            domain={[0, 22]}
          />
          {hasPolice && (
            <YAxis
              yAxisId="police"
              orientation="right"
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
              tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={[100000, 160000]}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontFamily: COLORS.mono, fontSize: "0.9rem", paddingTop: '8px' }} />
          <Line
            yAxisId="csew"
            type="monotone"
            dataKey="incidents"
            name="CSEW incidents"
            stroke={COLORS.accent}
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: COLORS.accent, strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls={false}
          />
          {hasPolice && (
            <Line
              yAxisId="police"
              type="monotone"
              dataKey="officers"
              name="Police officers"
              stroke={COLORS.accentBlue}
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ r: 2, fill: COLORS.accentBlue, strokeWidth: 0 }}
              activeDot={{ r: 3.5, strokeWidth: 0 }}
              connectNulls={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: "0.9rem", color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.25rem' }}>
        Source: ONS Crime Survey for England and Wales (CSEW) · Home Office Police Workforce Statistics · Excludes fraud and computer misuse for comparability
      </p>
    </div>
  );
}
