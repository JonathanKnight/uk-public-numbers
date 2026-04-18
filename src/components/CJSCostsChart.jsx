import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, LabelList,
  LineChart, Line, ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink:        '#1a1208',
  inkMuted:   '#5c5240',
  inkFaint:   '#9c8e7e',
  paper:      '#faf7f2',
  paperRule:  '#e8e0d0',
  accent:     '#c0392b',
  mono:       '"JetBrains Mono", monospace',
};

const BAR_COLORS = {
  'Police (E&W)':        '#1a4a7a',
  'Prisons & probation': '#c0392b',
  'Courts & tribunals':  '#d35400',
  'Legal Aid':           '#b8860b',
  'Crown Prosecution':   '#1a6b3a',
  'MoJ other':           '#9c8e7e',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length || payload[0].value == null) return null;
  return (
    <div style={{
      background: COLORS.paper,
      border: `1px solid ${COLORS.paperRule}`,
      borderLeft: `3px solid ${COLORS.accent}`,
      padding: '0.6rem 0.9rem',
      fontFamily: COLORS.mono,
      fontSize: '0.95rem',
      color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ color: COLORS.ink }}>£{payload[0].value.toFixed(1)}bn</div>
    </div>
  );
};

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length || payload[0].value == null) return null;
  return (
    <div style={{
      background: COLORS.paper,
      border: `1px solid ${COLORS.paperRule}`,
      borderLeft: `3px solid #1a4a7a`,
      padding: '0.6rem 0.9rem',
      fontFamily: COLORS.mono,
      fontSize: '0.95rem',
      color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ color: '#1a4a7a' }}>MoJ: £{payload[0].value.toFixed(1)}bn (2023–24 prices)</div>
    </div>
  );
};

function BreakdownChart({ data }) {
  const total = data.reduce((s, d) => s + d.bn, 0);
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        fontFamily: COLORS.mono, fontSize: '0.7rem', textTransform: 'uppercase',
        letterSpacing: '0.06em', color: COLORS.inkFaint, marginBottom: '0.75rem',
      }}>
        Budget by component · 2023–24 · £bn, 2023–24 prices
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 70, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={v => `£${v}bn`}
            tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
            domain={[0, 20]}
          />
          <YAxis
            type="category"
            dataKey="component"
            tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkMuted }}
            tickLine={false}
            axisLine={false}
            width={155}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: COLORS.paperRule, opacity: 0.4 }} />
          <Bar dataKey="bn" maxBarSize={20} radius={[0, 2, 2, 0]}>
            {data.map(d => (
              <Cell key={d.component} fill={BAR_COLORS[d.component] ?? COLORS.inkFaint} fillOpacity={0.85} />
            ))}
            <LabelList
              dataKey="bn"
              position="right"
              formatter={v => `£${v.toFixed(1)}bn`}
              style={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkMuted }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.85rem', color: COLORS.inkFaint, marginTop: '0.25rem' }}>
        Total: £{total.toFixed(1)}bn
      </p>
    </div>
  );
}

function TrendChart({ data }) {
  const peak = data.find(d => d.period === '2007-08');
  const trough = data.find(d => d.period === '2016-17');
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        fontFamily: COLORS.mono, fontSize: '0.7rem', textTransform: 'uppercase',
        letterSpacing: '0.06em', color: COLORS.inkFaint, marginBottom: '0.75rem',
      }}>
        MoJ budget only (excl. police) · £bn, 2023–24 prices · selected years
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint, angle: -45, textAnchor: 'end', dy: 4 }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
            height={45}
          />
          <YAxis
            tickFormatter={v => `£${v}bn`}
            tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={52}
            domain={[6, 15]}
          />
          <Tooltip content={<TrendTooltip />} />
          {peak && (
            <ReferenceLine
              x={peak.period}
              stroke={COLORS.inkFaint}
              strokeDasharray="3 3"
              label={{ value: 'peak', position: 'insideTopRight', fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint }}
            />
          )}
          {trough && (
            <ReferenceLine
              x={trough.period}
              stroke={COLORS.inkFaint}
              strokeDasharray="3 3"
              label={{ value: 'trough', position: 'insideTopRight', fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint }}
            />
          )}
          <Line
            type="monotone"
            dataKey="moj_real"
            stroke="#1a4a7a"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: '#1a4a7a', strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.85rem', color: COLORS.inkFaint, marginTop: '0.25rem' }}>
        MoJ only — excludes Home Office police budget (£17.2bn in 2023–24). Only verified years shown; gaps not interpolated.
      </p>
    </div>
  );
}

export default function CJSCostsChart({ breakdown, mojTrend, costPerCrime }) {
  if (!breakdown?.length) return (
    <p style={{ fontFamily: COLORS.mono, fontSize: '0.95rem', color: COLORS.inkFaint, padding: '1rem 0' }}>
      No data available.
    </p>
  );

  return (
    <div style={{ width: '100%' }}>
      {costPerCrime != null && (
        <div style={{
          display: 'inline-block',
          marginBottom: '1.25rem',
          padding: '0.6rem 1rem',
          background: COLORS.paper,
          border: `1px solid ${COLORS.paperRule}`,
          borderLeft: `3px solid #1a4a7a`,
        }}>
          <span style={{ fontFamily: COLORS.mono, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: COLORS.inkFaint }}>
            Cost per CSEW crime 2023–24&nbsp;&nbsp;
          </span>
          <span style={{ fontFamily: COLORS.mono, fontSize: '1.1rem', fontWeight: 700, color: COLORS.ink }}>
            £{costPerCrime.toLocaleString()}
          </span>
          <span style={{ fontFamily: COLORS.mono, fontSize: '0.75rem', color: COLORS.inkFaint, marginLeft: '0.4rem' }}>
            (£29.0bn ÷ 7.9M incidents)
          </span>
        </div>
      )}
      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
        <BreakdownChart data={breakdown} />
        {mojTrend?.length > 0 && <TrendChart data={mojTrend} />}
      </div>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.9rem', color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.75rem' }}>
        Sources: HM Treasury PESA 2024 · Home Office Police Funding for England and Wales · IFS 'Justice spending in England and Wales' (Feb 2025) · All figures in 2023–24 prices (GDP deflator)
      </p>
    </div>
  );
}
