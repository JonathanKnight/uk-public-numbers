import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
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
      borderLeft: `3px solid ${COLORS.accent}`,
      padding: '0.6rem 0.8rem',
      fontFamily: COLORS.mono,
      fontSize: '0.7rem',
      color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.4rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '0.15rem' }}>
          {p.name}: {typeof p.value === 'number' && p.value > 1000
            ? p.value.toLocaleString()
            : `${p.value}M`}
        </div>
      ))}
    </div>
  );
};

/**
 * Merges beds (annual) and A&E attendances (annual) onto matching FY periods.
 */
function mergeData(bedsAnnual, aeAnnual) {
  const byPeriod = {};
  for (const d of bedsAnnual) byPeriod[d.period] = { period: d.period, beds: d.value };
  for (const d of aeAnnual) {
    if (byPeriod[d.period]) byPeriod[d.period].ae = d.value;
  }
  return Object.values(byPeriod)
    .filter(d => d.beds && d.ae)
    .sort((a, b) => a.period.localeCompare(b.period));
}

export default function CapacityDemandChart({ bedsAnnual, aeAnnual }) {
  const data = mergeData(bedsAnnual, aeAnnual);

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 48, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontFamily: COLORS.mono, fontSize: 9.5, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
            interval={1}
          />
          {/* Left axis: beds */}
          <YAxis
            yAxisId="beds"
            domain={[100000, 160000]}
            ticks={[100000, 110000, 120000, 130000, 140000, 150000, 160000]}
            tick={{ fontFamily: COLORS.mono, fontSize: 9.5, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
            width={36}
          />
          {/* Right axis: A&E attendances */}
          <YAxis
            yAxisId="ae"
            orientation="right"
            domain={[15, 32]}
            ticks={[15, 20, 25, 30]}
            tick={{ fontFamily: COLORS.mono, fontSize: 9.5, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}M`}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontFamily: COLORS.mono, fontSize: '0.65rem', paddingTop: '8px' }}
          />
          <Bar
            yAxisId="beds"
            dataKey="beds"
            name="Beds available"
            fill={COLORS.accentBlue}
            fillOpacity={0.55}
            radius={[1, 1, 0, 0]}
            barSize={14}
          />
          <Line
            yAxisId="ae"
            type="monotone"
            dataKey="ae"
            name="A&E attendances"
            stroke={COLORS.accent}
            strokeWidth={2}
            dot={{ r: 2.5, fill: COLORS.accent, strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p style={{
        fontFamily: COLORS.mono, fontSize: '0.65rem', color: COLORS.inkFaint,
        letterSpacing: '0.04em', marginTop: '0.25rem',
      }}>
        Beds (left axis): NHS England KH03 · A&amp;E attendances (right axis): NHS England time series
      </p>
    </div>
  );
}
