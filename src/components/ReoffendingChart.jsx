import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer,
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

function rateColor(rate) {
  if (rate >= 45) return '#c0392b';
  if (rate >= 35) return '#d35400';
  if (rate >= 25) return '#b8860b';
  return '#1a4a7a';
}

const RateTrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: COLORS.paper,
      border: `1px solid ${COLORS.paperRule}`,
      borderLeft: `3px solid ${COLORS.accent}`,
      padding: '0.6rem 0.9rem',
      fontFamily: COLORS.mono,
      fontSize: "0.95rem",
      color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      {payload.map(p => p.value != null && (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '0.1rem' }}>
          {p.name}:{' '}
          {p.dataKey === 'rate'
            ? `${p.value}%`
            : p.value.toLocaleString()}
        </div>
      ))}
    </div>
  );
};

const ProlificTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: COLORS.paper,
      border: `1px solid ${COLORS.paperRule}`,
      borderLeft: `3px solid ${COLORS.accent}`,
      padding: '0.6rem 0.9rem',
      fontFamily: COLORS.mono,
      fontSize: "0.95rem",
      color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label} previous offences</div>
      <div>Reoffending rate: {d?.payload?.rate}%</div>
      <div style={{ color: COLORS.inkFaint, fontSize: "0.9rem" }}>
        {d?.payload?.pct_of_offenders}% of offenders · {d?.payload?.pct_of_reoffences}% of all reoffences
      </div>
    </div>
  );
};

export default function ReoffendingChart({ rateSeries, byPreviousOffences }) {
  return (
    <div style={{ width: '100%' }}>
      {/* Reoffending rate trend */}
      {rateSeries?.length > 0 && (
        <>
          <div style={{
            fontFamily: COLORS.mono, fontSize: "0.9rem", textTransform: 'uppercase',
            letterSpacing: '0.06em', color: COLORS.inkFaint, marginBottom: '0.5rem',
          }}>
            Proven reoffending rate · % of offenders who reoffended within 1 year
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={rateSeries} margin={{ top: 8, right: 60, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
                tickLine={false}
                axisLine={{ stroke: COLORS.paperRule }}
              />
              <YAxis
                yAxisId="rate"
                orientation="left"
                tickFormatter={v => `${v}%`}
                tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
                tickLine={false}
                axisLine={false}
                width={36}
                domain={[20, 35]}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip content={<RateTrendTooltip />} />
              <Legend wrapperStyle={{ fontFamily: COLORS.mono, fontSize: "0.9rem", paddingTop: '6px' }} />
              <Bar
                yAxisId="count"
                dataKey="reoffenders"
                name="Number of reoffenders"
                fill={COLORS.accentBlue}
                fillOpacity={0.4}
                maxBarSize={20}
                radius={[1, 1, 0, 0]}
              />
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="rate"
                name="Reoffending rate %"
                stroke={COLORS.accent}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLORS.accent, strokeWidth: 0 }}
                activeDot={{ r: 4.5, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}

      {/* Prolific offenders by previous offence count */}
      {byPreviousOffences?.data?.length > 0 && (
        <>
          <div style={{
            fontFamily: COLORS.mono, fontSize: "0.9rem", textTransform: 'uppercase',
            letterSpacing: '0.06em', color: COLORS.inkFaint, margin: '2rem 0 0.5rem',
          }}>
            Reoffending rate by number of previous offences · {byPreviousOffences.period}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={byPreviousOffences.data}
              margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
              <XAxis
                dataKey="band"
                tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
                tickLine={false}
                axisLine={{ stroke: COLORS.paperRule }}
              />
              <YAxis
                tickFormatter={v => `${v}%`}
                tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
                tickLine={false}
                axisLine={false}
                width={36}
                domain={[0, 55]}
              />
              <Tooltip content={<ProlificTooltip />} cursor={{ fill: COLORS.paperRule, opacity: 0.4 }} />
              <Bar dataKey="rate" name="Reoffending rate %" maxBarSize={40} radius={[2, 2, 0, 0]}>
                {byPreviousOffences.data.map(d => (
                  <Cell key={d.band} fill={rateColor(d.rate)} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontFamily: COLORS.mono, fontSize: "0.9rem", color: COLORS.inkFaint, lineHeight: 1.5, marginTop: '0.5rem' }}>
            Offenders with 11+ previous convictions make up {byPreviousOffences.data.find(d => d.band === '11+ previous')?.pct_of_offenders}% of offenders
            but account for {byPreviousOffences.data.find(d => d.band === '11+ previous')?.pct_of_reoffences}% of all proven reoffences.
          </p>
        </>
      )}

      <p style={{ fontFamily: COLORS.mono, fontSize: "0.9rem", color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.5rem' }}>
        Source: MoJ Proven Reoffending Statistics · Adult offenders, England &amp; Wales · 1-year follow-up period
      </p>
    </div>
  );
}
