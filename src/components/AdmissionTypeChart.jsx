import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink:        '#1a1208',
  inkMuted:   '#5c5240',
  inkFaint:   '#9c8e7e',
  paper:      '#faf7f2',
  paperRule:  '#e8e0d0',
  accentBlue: '#1a4a7a',
  accent:     '#c0392b',
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
        <div key={p.dataKey} style={{ color: p.fill, marginBottom: '0.15rem' }}>
          {p.name}: {(p.value / 1e6).toFixed(2)}M
        </div>
      ))}
    </div>
  );
};

export default function AdmissionTypeChart({ series }) {
  if (!series?.length) return (
    <p style={{ fontFamily: COLORS.mono, fontSize: '0.8rem', color: COLORS.inkFaint, padding: '1rem 0' }}>
      No data. Run <code>node scripts/fetch-hospital-activity.js</code> to populate.
    </p>
  );

  // Calculate elective (non-emergency, non-day-case)
  const data = series.map(d => ({
    period: d.period,
    day_case: d.day_case_fce,
    elective_overnight: Math.max(0, (d.elective_fce ?? 0) - (d.day_case_fce ?? 0)),
    emergency: d.emergency_fce,
  }));

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }} stackOffset="none">
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontFamily: COLORS.mono, fontSize: 11, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
            interval={2}
          />
          <YAxis
            tickFormatter={v => `${(v / 1e6).toFixed(0)}M`}
            tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontFamily: COLORS.mono, fontSize: '0.75rem', paddingTop: '8px' }} />
          <Bar dataKey="day_case"            name="Day case"              stackId="a" fill={COLORS.accentBlue} fillOpacity={0.9} />
          <Bar dataKey="elective_overnight"  name="Elective overnight"    stackId="a" fill={COLORS.accentBlue} fillOpacity={0.5} />
          <Bar dataKey="emergency"           name="Emergency admission"   stackId="a" fill={COLORS.accent}     fillOpacity={0.75} radius={[1,1,0,0]} />
        </BarChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.75rem', color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.25rem' }}>
        Source: NHS Digital HES · Day case + elective overnight + emergency admissions
      </p>
    </div>
  );
}
