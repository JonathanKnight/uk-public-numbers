import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink:        '#1a1208',
  inkMuted:   '#5c5240',
  inkFaint:   '#9c8e7e',
  paper:      '#faf7f2',
  paperRule:  '#e8e0d0',
  mono:       '"JetBrains Mono", monospace',
};

// Distinct palette for 9 specialty groups — editorial / FT-style
const GROUP_COLORS = {
  surgery:      '#1a4a7a',   // dark blue
  medicine:     '#2e7d5e',   // teal-green
  emergency:    '#c0392b',   // red
  neurology:    '#6b3fa0',   // purple
  obs_gynae:    '#b8860b',   // amber
  paediatrics:  '#1a6b8a',   // mid-blue
  mental_health:'#5c4a1e',   // brown
  oncology:     '#8b4513',   // saddle brown
  other:        '#9c8e7e',   // warm grey
};

const GROUP_LABELS = {
  surgery:      'Surgery',
  medicine:     'Medicine',
  emergency:    'Emergency Medicine',
  neurology:    'Neurology & Neurosurgery',
  obs_gynae:    'Obs & Gynaecology',
  paediatrics:  'Paediatrics',
  mental_health:'Mental Health',
  oncology:     'Oncology',
  other:        'Other',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div style={{
      background: COLORS.paper,
      border: `1px solid ${COLORS.paperRule}`,
      borderLeft: `3px solid ${COLORS.inkMuted}`,
      padding: '0.6rem 0.9rem',
      fontFamily: COLORS.mono,
      fontSize: "0.9rem",
      color: COLORS.inkMuted,
      minWidth: '200px',
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.4rem' }}>
        {label} — {(total / 1e6).toFixed(2)}M total
      </div>
      {[...payload].reverse().map(p => p.value > 0 && (
        <div key={p.dataKey} style={{ color: GROUP_COLORS[p.dataKey] ?? COLORS.inkMuted, marginBottom: '0.1rem' }}>
          {p.name}: {(p.value / 1e6).toFixed(2)}M
        </div>
      ))}
    </div>
  );
};

export default function SpecialtyBreakdownChart({ series }) {
  if (!series?.length) return (
    <p style={{ fontFamily: COLORS.mono, fontSize: "0.95rem", color: COLORS.inkFaint, padding: '1rem 0' }}>
      No data. Run <code>node scripts/fetch-hospital-activity.js</code> to populate.
    </p>
  );

  // Flatten by_group into top-level fields for Recharts
  const data = series.map(d => ({ period: d.period, ...d.by_group }));
  const groups = Object.keys(GROUP_LABELS);

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }} stackOffset="none">
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
            interval={2}
          />
          <YAxis
            tickFormatter={v => `${(v / 1e6).toFixed(0)}M`}
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontFamily: COLORS.mono, fontSize: "0.9rem", paddingTop: '8px' }} />
          {groups.map(g => (
            <Area
              key={g}
              type="monotone"
              dataKey={g}
              name={GROUP_LABELS[g]}
              stackId="1"
              stroke={GROUP_COLORS[g]}
              fill={GROUP_COLORS[g]}
              fillOpacity={0.75}
              strokeWidth={0}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: "0.9rem", color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.25rem' }}>
        Source: NHS Digital HES · Finished Consultant Episodes by treatment specialty group
      </p>
    </div>
  );
}
