import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Label
} from 'recharts';

// Matches CSS custom properties in global.css
const COLORS = {
  ink:      '#1a1208',
  inkMuted: '#5c5240',
  inkFaint: '#9c8e7e',
  paper:    '#faf7f2',
  paperWarm:'#f5f0e8',
  paperRule:'#e8e0d0',
  accent:   '#c0392b',
  good:     '#1a6b3a',
  mono:     '"JetBrains Mono", monospace',
  serif:    '"Source Serif 4", Georgia, serif',
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
      fontSize: '0.8rem',
      color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.25rem' }}>{label}</div>
      <div>{payload[0].value}%</div>
    </div>
  );
};

export default function AEChart({ history, target }) {
  // Abbreviate period labels so they fit: "April 2022" → "Apr 22"
  const MONTH_ABBR = {
    January:'Jan', February:'Feb', March:'Mar', April:'Apr',
    May:'May', June:'Jun', July:'Jul', August:'Aug',
    September:'Sep', October:'Oct', November:'Nov', December:'Dec',
  };
  const data = history.map(d => {
    const [month, year] = d.period.split(' ');
    return { ...d, label: `${MONTH_ABBR[month] ?? month} ${String(year).slice(2)}` };
  });

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid
            strokeDasharray="2 4"
            stroke={COLORS.paperRule}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
            interval={3}
          />
          <YAxis
            domain={[60, 100]}
            ticks={[65, 70, 75, 80, 85, 90, 95, 100]}
            tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}%`}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={target}
            stroke={COLORS.accent}
            strokeDasharray="4 3"
            strokeWidth={1.5}
          >
            <Label
              value="95% target"
              position="insideTopRight"
              style={{ fontFamily: COLORS.mono, fontSize: 11, fill: COLORS.accent }}
              offset={4}
            />
          </ReferenceLine>
          <Line
            type="monotone"
            dataKey="value"
            stroke={COLORS.inkMuted}
            strokeWidth={2}
            dot={{ r: 2.5, fill: COLORS.inkMuted, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: COLORS.accent, strokeWidth: 0 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p style={{
        fontFamily: COLORS.mono,
        fontSize: '0.75rem',
        color: COLORS.inkFaint,
        letterSpacing: '0.04em',
        marginTop: '0.5rem',
      }}>
        Source: NHS England A&amp;E Attendances and Emergency Admissions · Monthly CSVs
      </p>
    </div>
  );
}
