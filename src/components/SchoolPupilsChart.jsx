import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink:       '#1a1208',
  inkMuted:  '#5c5240',
  inkFaint:  '#9c8e7e',
  paper:     '#faf7f2',
  paperRule: '#e8e0d0',
  primary:   '#1a4a7a',
  secondary: '#c0392b',
  mono:      '"JetBrains Mono", monospace',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: COLORS.paper, border: `1px solid ${COLORS.paperRule}`,
      borderLeft: `3px solid ${COLORS.inkFaint}`, padding: '0.6rem 0.9rem',
      fontFamily: COLORS.mono, fontSize: '0.9rem', color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.stroke }}>
          {p.name}: {(p.value / 1000).toFixed(2)}M
        </div>
      ))}
    </div>
  );
};

export default function SchoolPupilsChart({ series, projections }) {
  const allData = [
    ...series.map(d => ({ ...d, label: String(d.year) })),
    ...projections.map(d => ({ ...d, label: String(d.year), isProj: true })),
  ];

  const firstProjYear = projections[0]?.year;

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={allData} margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint, angle: -45, textAnchor: 'end', dy: 4 }}
            tickLine={false} axisLine={{ stroke: COLORS.paperRule }}
            interval={3} height={50}
          />
          <YAxis
            tickFormatter={v => `${(v / 1000).toFixed(1)}M`}
            tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint }}
            tickLine={false} axisLine={false} width={50}
            domain={[2800, 5200]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontFamily: COLORS.mono, fontSize: '0.75rem', color: COLORS.inkFaint, paddingTop: '0.5rem' }}
          />
          {firstProjYear && (
            <ReferenceLine
              x={String(firstProjYear)}
              stroke={COLORS.inkFaint} strokeDasharray="3 3"
              label={{ value: 'projection →', position: 'insideTopLeft', fontFamily: COLORS.mono, fontSize: 11, fill: COLORS.inkFaint }}
            />
          )}
          <Line
            type="monotone" dataKey="primary" name="Primary"
            stroke={COLORS.primary} strokeWidth={2.5}
            dot={d => d.payload.isProj ? null : <circle key={d.key} cx={d.cx} cy={d.cy} r={2.5} fill={COLORS.primary} />}
            strokeDasharray={d => undefined}
          />
          <Line
            type="monotone" dataKey="secondary" name="Secondary"
            stroke={COLORS.secondary} strokeWidth={2.5}
            dot={d => d.payload.isProj ? null : <circle key={d.key} cx={d.cx} cy={d.cy} r={2.5} fill={COLORS.secondary} />}
          />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.85rem', color: COLORS.inkFaint, marginTop: '0.25rem' }}>
        Thousands · state-funded schools, England · January census · projections from 2025 (ONS 2020-based population projections)
      </p>
    </div>
  );
}
