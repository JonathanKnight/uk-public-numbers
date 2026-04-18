import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink:         '#1a1208',
  inkMuted:    '#5c5240',
  inkFaint:    '#9c8e7e',
  paper:       '#faf7f2',
  paperRule:   '#e8e0d0',
  accentBlue:  '#1a4a7a',
  accentGreen: '#1a6b3a',
  accent:      '#c0392b',
  mono:        '"JetBrains Mono", monospace',
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
      {payload.map(p => {
        if (p.value == null) return null;
        const fmt = p.dataKey === 'patients_per_gp'
          ? `${p.value.toLocaleString()} patients/GP`
          : `${p.value.toLocaleString()} FTE`;
        return (
          <div key={p.dataKey} style={{ color: p.color, marginBottom: '0.15rem' }}>
            {p.name}: {fmt}
          </div>
        );
      })}
    </div>
  );
};

export default function GPWorkforceChart({ series }) {
  // Filter out entries that have no GP data at all
  const data = series.filter(d => d.qualified_fte != null || d.trainee_fte != null);

  if (data.length === 0) {
    return (
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.75rem', color: COLORS.inkFaint, padding: '1rem 0' }}>
        No data available. Run <code>node scripts/fetch-gp-workforce.js</code> to populate.
      </p>
    );
  }

  // Compute combined total for stacked bars — used as axis domain reference
  const maxGPs = Math.max(...data.map(d => (d.qualified_fte ?? 0) + (d.trainee_fte ?? 0)));

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 48, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontFamily: COLORS.mono, fontSize: 9.5, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
          />
          {/* Left axis — GP FTE */}
          <YAxis
            yAxisId="gp"
            orientation="left"
            domain={[0, Math.ceil(maxGPs / 5000) * 5000]}
            tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
            tick={{ fontFamily: COLORS.mono, fontSize: 10, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          {/* Right axis — patients per GP */}
          <YAxis
            yAxisId="pts"
            orientation="right"
            domain={[1500, 2600]}
            tickFormatter={v => v.toLocaleString()}
            tick={{ fontFamily: COLORS.mono, fontSize: 10, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontFamily: COLORS.mono, fontSize: '0.65rem', paddingTop: '8px' }}
          />
          <Bar
            yAxisId="gp"
            dataKey="qualified_fte"
            name="Qualified GPs"
            stackId="gp"
            fill={COLORS.accentBlue}
            opacity={0.85}
            maxBarSize={32}
          />
          <Bar
            yAxisId="gp"
            dataKey="trainee_fte"
            name="GP Trainees (registrars)"
            stackId="gp"
            fill={COLORS.accentGreen}
            opacity={0.85}
            maxBarSize={32}
          />
          <Line
            yAxisId="pts"
            type="monotone"
            dataKey="patients_per_gp"
            name="Patients per qualified GP"
            stroke={COLORS.accent}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS.accent, strokeWidth: 0 }}
            activeDot={{ r: 4.5, strokeWidth: 0 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p style={{
        fontFamily: COLORS.mono, fontSize: '0.65rem', color: COLORS.inkFaint,
        letterSpacing: '0.04em', marginTop: '0.25rem',
      }}>
        Source: NHS Digital General Practice Workforce Statistics · September FTE snapshot each year ·
        Patients per GP = registered patients ÷ qualified GP FTE
      </p>
    </div>
  );
}
