import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink:        '#1a1208',
  inkMuted:   '#5c5240',
  inkFaint:   '#9c8e7e',
  paper:      '#faf7f2',
  paperRule:  '#e8e0d0',
  accent:     '#c0392b',
  accentGreen:'#1a6b3a',
  mono:       '"JetBrains Mono", monospace',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length || payload[0].value == null) return null;
  const val = payload[0].value;
  return (
    <div style={{
      background: COLORS.paper,
      border: `1px solid ${COLORS.paperRule}`,
      borderLeft: `3px solid ${COLORS.accentGreen}`,
      padding: '0.6rem 0.9rem',
      fontFamily: COLORS.mono,
      fontSize: "0.95rem",
      color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ color: COLORS.accentGreen }}>{val.toFixed(1)} crimes per officer</div>
    </div>
  );
};

export default function CrimesPerOfficerChart({ csewSeries, policeSeries }) {
  if (!csewSeries?.length || !policeSeries?.length) return (
    <p style={{ fontFamily: COLORS.mono, fontSize: "0.95rem", color: COLORS.inkFaint, padding: '1rem 0' }}>
      No data available.
    </p>
  );

  // Align by end of financial year: "1993/94" → Mar 1994
  const policeByEndYear = {};
  for (const p of policeSeries) {
    const yr = parseInt(p.period.replace('Mar ', ''), 10);
    policeByEndYear[yr] = p.headcount;
  }

  const data = csewSeries.flatMap(d => {
    const endYear = parseInt(d.period.split('/')[0], 10) + 1;
    const headcount = policeByEndYear[endYear];
    if (!headcount) return [];
    return [{
      period: d.period,
      ratio: parseFloat(((d.incidents * 1_000_000) / headcount).toFixed(1)),
    }];
  });

  if (!data.length) return null;

  const peak = Math.max(...data.map(d => d.ratio));

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
            interval={3}
          />
          <YAxis
            tickFormatter={v => v}
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={36}
            domain={[0, Math.ceil(peak / 10) * 10 + 10]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={data[data.length - 1]?.ratio}
            stroke={COLORS.inkFaint}
            strokeDasharray="3 3"
            label={{
              value: `${data[data.length - 1]?.ratio} latest`,
              position: 'insideTopRight',
              fontFamily: COLORS.mono,
              fontSize: 14,
              fill: COLORS.inkFaint,
            }}
          />
          <Line
            type="monotone"
            dataKey="ratio"
            name="Crimes per officer"
            stroke={COLORS.accentGreen}
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: COLORS.accentGreen, strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: "0.9rem", color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.25rem' }}>
        CSEW incidents ÷ police officer headcount (31 March, end of financial year) · excludes fraud &amp; cyber
      </p>
    </div>
  );
}
