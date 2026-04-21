import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = {
  ink: '#1a1208', inkMuted: '#5c5240', inkFaint: '#9c8e7e',
  paper: '#faf7f2', paperRule: '#e8e0d0',
  domestic: '#1a4a7a', international: '#c0392b',
  mono: '"JetBrains Mono", monospace',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const dom   = payload.find(p => p.dataKey === 'domestic');
  const intl  = payload.find(p => p.dataKey === 'international');
  const total = (dom?.value ?? 0) + (intl?.value ?? 0);
  return (
    <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.paperRule}`, borderLeft: `3px solid ${COLORS.inkFaint}`, padding: '0.6rem 0.9rem', fontFamily: COLORS.mono, fontSize: '0.9rem', color: COLORS.inkMuted }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      {dom  && <div style={{ color: COLORS.domestic }}>Domestic: {dom.value.toLocaleString()}k</div>}
      {intl && <div style={{ color: COLORS.international }}>International: {intl.value.toLocaleString()}k</div>}
      <div style={{ color: COLORS.inkMuted, borderTop: `1px solid ${COLORS.paperRule}`, marginTop: '0.3rem', paddingTop: '0.3rem' }}>Total: {total.toLocaleString()}k</div>
    </div>
  );
};

export default function HEStudentTrendChart({ series, projections }) {
  const allData = [
    ...series.map(d => ({ ...d })),
    ...projections.map(d => ({ ...d })),
  ];
  const firstProjYear = projections[0]?.year;

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={allData} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <defs>
            <pattern id="projectionHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke={COLORS.inkFaint} strokeWidth="1" strokeOpacity="0.3" />
            </pattern>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontFamily: COLORS.mono, fontSize: 11, fill: COLORS.inkFaint, angle: -45, textAnchor: 'end', dy: 4 }}
            tickLine={false} axisLine={{ stroke: COLORS.paperRule }}
            interval={2} height={50}
          />
          <YAxis
            tickFormatter={v => `${v}k`}
            tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint }}
            tickLine={false} axisLine={false} width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontFamily: COLORS.mono, fontSize: '0.75rem', paddingTop: '0.5rem' }} />
          {firstProjYear && (
            <ReferenceLine x={firstProjYear} stroke={COLORS.inkFaint} strokeDasharray="3 3"
              label={{ value: 'projection →', position: 'insideTopLeft', fontFamily: COLORS.mono, fontSize: 11, fill: COLORS.inkFaint }}
            />
          )}
          <Area type="monotone" dataKey="domestic"      name="Domestic"      stackId="1" stroke={COLORS.domestic}      fill={COLORS.domestic}      fillOpacity={0.15} strokeWidth={2} />
          <Area type="monotone" dataKey="international" name="International" stackId="1" stroke={COLORS.international} fill={COLORS.international} fillOpacity={0.25} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.85rem', color: COLORS.inkFaint, marginTop: '0.25rem' }}>
        Thousands · all students (UG + PG, FT + PT) · UK HEIs · HESA · projections from 2023-24 reflect visa policy impacts
      </p>
    </div>
  );
}
