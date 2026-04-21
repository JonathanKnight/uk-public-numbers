import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink: '#1a1208', inkMuted: '#5c5240', inkFaint: '#9c8e7e',
  paper: '#faf7f2', paperRule: '#e8e0d0',
  accent: '#1a6b3a',
  mono: '"JetBrains Mono", monospace',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length || payload[0].value == null) return null;
  return (
    <div style={{
      background: COLORS.paper, border: `1px solid ${COLORS.paperRule}`,
      borderLeft: `3px solid ${COLORS.accent}`, padding: '0.6rem 0.9rem',
      fontFamily: COLORS.mono, fontSize: '0.9rem', color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ color: COLORS.accent }}>{payload[0].value.toFixed(1)} pupils per teacher</div>
    </div>
  );
};

export default function PupilsPerTeacherChart({ pupilsSeries, teacherSeries }) {
  if (!pupilsSeries?.length || !teacherSeries?.length) return null;

  const teacherByYear = {};
  for (const t of teacherSeries) teacherByYear[t.year] = t.fte;

  const data = pupilsSeries.flatMap(d => {
    const fte = teacherByYear[d.year];
    if (!fte) return [];
    const totalPupils = (d.primary + d.secondary) * 1000;
    return [{ year: d.year, ratio: parseFloat((totalPupils / fte).toFixed(1)) }];
  });

  if (!data.length) return null;

  const latest = data[data.length - 1];
  const peak   = data.reduce((m, d) => d.ratio > m.ratio ? d : m, data[0]);

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint, angle: -45, textAnchor: 'end', dy: 4 }}
            tickLine={false} axisLine={{ stroke: COLORS.paperRule }}
            interval={2} height={50}
          />
          <YAxis
            tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint }}
            tickLine={false} axisLine={false} width={28}
            domain={[15, 20]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={latest.ratio}
            stroke={COLORS.inkFaint} strokeDasharray="3 3"
            label={{ value: `${latest.ratio} latest`, position: 'insideTopRight', fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint }}
          />
          <Line
            type="monotone" dataKey="ratio" stroke={COLORS.accent} strokeWidth={2.5}
            dot={{ r: 3, fill: COLORS.accent, strokeWidth: 0 }} activeDot={{ r: 4.5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.85rem', color: COLORS.inkFaint, marginTop: '0.25rem' }}>
        (Primary + secondary pupils) ÷ FTE teacher headcount · state-funded schools, England
      </p>
    </div>
  );
}
