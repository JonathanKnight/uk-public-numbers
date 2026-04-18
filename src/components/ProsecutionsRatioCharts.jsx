import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink:        '#1a1208',
  inkMuted:   '#5c5240',
  inkFaint:   '#9c8e7e',
  paper:      '#faf7f2',
  paperRule:  '#e8e0d0',
  accentBlue: '#1a4a7a',
  accentGreen:'#1a6b3a',
  mono:       '"JetBrains Mono", monospace',
};

function makeTooltip(color, fmt) {
  return ({ active, payload, label: l }) => {
    if (!active || !payload?.length || payload[0].value == null) return null;
    return (
      <div style={{
        background: COLORS.paper,
        border: `1px solid ${COLORS.paperRule}`,
        borderLeft: `3px solid ${color}`,
        padding: '0.6rem 0.9rem',
        fontFamily: COLORS.mono,
        fontSize: '0.95rem',
        color: COLORS.inkMuted,
      }}>
        <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{l}</div>
        <div style={{ color }}>{fmt(payload[0].value)}</div>
      </div>
    );
  };
}

const ProsTooltip = makeTooltip(COLORS.accentBlue,  v => `${Math.round(v)}% of CSEW crimes`);
const ConvTooltip = makeTooltip(COLORS.accentGreen, v => `${v.toFixed(2)} per officer`);

function RatioChart({ data, dataKey, color, TooltipComponent, title, tickFormat }) {
  const peak = Math.max(...data.map(d => d[dataKey] ?? 0));

  return (
    <div style={{ flex: 1 }}>
      <div style={{
        fontFamily: COLORS.mono,
        fontSize: '0.9rem',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: COLORS.inkFaint,
        marginBottom: '0.75rem',
      }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
          />
          <YAxis
            tickFormatter={tickFormat ?? (v => v.toFixed(2))}
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={42}
            domain={[0, parseFloat((peak * 1.15).toFixed(2))]}
          />
          <Tooltip content={<TooltipComponent />} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 4.5, strokeWidth: 0 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ProsecutionsRatioCharts({ prosecutionSeries, policeSeries, csewSeries }) {
  if (!prosecutionSeries?.length) return (
    <p style={{ fontFamily: COLORS.mono, fontSize: '0.95rem', color: COLORS.inkFaint, padding: '1rem 0' }}>
      No data available.
    </p>
  );

  // CSEW uses "YYYY/YY" financial years; align prosecution calendar year N to CSEW "N/NN".
  const csewByStartYear = {};
  for (const c of (csewSeries ?? [])) {
    const yr = parseInt(c.period.split('/')[0], 10);
    csewByStartYear[yr] = c.incidents; // millions
  }

  // Police data uses "Mar YYYY"; align to same calendar year.
  const policeByYear = {};
  for (const p of (policeSeries ?? [])) {
    const yr = parseInt(p.period.replace('Mar ', ''), 10);
    policeByYear[yr] = p.headcount;
  }

  const prosPerCrime = prosecutionSeries.flatMap(d => {
    const yr = parseInt(d.period, 10);
    const incidents = csewByStartYear[yr];
    if (!incidents) return [];
    // incidents is in millions; result as percentage of CSEW crimes
    return [{ period: d.period, value: parseFloat(((d.prosecuted / (incidents * 1e6)) * 100).toFixed(2)) }];
  });

  const convPerOfficer = prosecutionSeries.flatMap(d => {
    const yr = parseInt(d.period, 10);
    const headcount = policeByYear[yr];
    if (!headcount) return [];
    return [{ period: d.period, value: parseFloat((d.convicted / headcount).toFixed(2)) }];
  });

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
        <RatioChart
          data={prosPerCrime}
          dataKey="value"
          color={COLORS.accentBlue}
          TooltipComponent={ProsTooltip}
          title="Prosecutions per recorded crime (CSEW)"
          tickFormat={v => `${Math.round(v)}%`}
        />
        <RatioChart
          data={convPerOfficer}
          dataKey="value"
          color={COLORS.accentGreen}
          TooltipComponent={ConvTooltip}
          title="Convictions per police officer"
          tickFormat={v => v.toFixed(1)}
        />
      </div>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.9rem', color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.75rem' }}>
        Left: MoJ prosecutions ÷ CSEW survey incidents (excl. fraud/cyber) · Right: MoJ convictions ÷ Home Office officer headcount (31 March) · England &amp; Wales
      </p>
    </div>
  );
}
