import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink:        '#1a1208',
  inkMuted:   '#5c5240',
  inkFaint:   '#9c8e7e',
  paper:      '#faf7f2',
  paperRule:  '#e8e0d0',
  mono:       '"JetBrains Mono", monospace',
};

const ETHNICITY_COLORS = {
  'White':        '#1a4a7a',
  'Black':        '#c0392b',
  'Asian':        '#b8860b',
  'Mixed':        '#2e7d5e',
  'Other':        '#6b3fa0',
  'Not recorded': '#9c8e7e',
};

const NATIONALITY_COLORS = {
  'British':         '#1a4a7a',
  'Foreign national':'#c0392b',
  'Not recorded':    '#9c8e7e',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: COLORS.paper,
      border: `1px solid ${COLORS.paperRule}`,
      borderLeft: `3px solid ${COLORS.inkMuted}`,
      padding: '0.5rem 0.8rem',
      fontFamily: COLORS.mono,
      fontSize: "0.95rem",
      color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600 }}>{label}</div>
      <div>{payload[0]?.value}% of prison population</div>
    </div>
  );
};

function DemoBar({ data, colors, title, note }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        fontFamily: COLORS.mono,
        fontSize: "0.9rem",
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: COLORS.inkFaint,
        marginBottom: '0.5rem',
      }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 40, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={v => `${v}%`}
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
            domain={[0, 80]}
          />
          <YAxis
            type="category"
            dataKey="group"
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkMuted }}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: COLORS.paperRule, opacity: 0.4 }} />
          <Bar dataKey="pct" maxBarSize={16} radius={[0, 2, 2, 0]}>
            {data.map(d => (
              <Cell key={d.group} fill={colors[d.group] ?? COLORS.inkFaint} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {note && (
        <p style={{ fontFamily: COLORS.mono, fontSize: "0.9rem", color: COLORS.inkFaint, marginTop: '0.5rem', lineHeight: 1.5 }}>
          {note}
        </p>
      )}
    </div>
  );
}

export default function PrisonDemographicsChart({ byEthnicity, byNationality }) {
  if (!byEthnicity?.data?.length && !byNationality?.data?.length) return (
    <p style={{ fontFamily: COLORS.mono, fontSize: "0.95rem", color: COLORS.inkFaint, padding: '1rem 0' }}>
      No demographic breakdown data available.
    </p>
  );

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
        {byEthnicity?.data?.length > 0 && (
          <DemoBar
            data={byEthnicity.data}
            colors={ETHNICITY_COLORS}
            title={`By ethnicity · ${byEthnicity.period}`}
            note="Self-reported ethnicity. England & Wales general population is ~81% White (2021 Census)."
          />
        )}
        {byNationality?.data?.length > 0 && (
          <DemoBar
            data={byNationality.data}
            colors={NATIONALITY_COLORS}
            title={`By nationality · ${byNationality.period}`}
            note={`'Foreign national' covers ~160 nationalities. 16% not recorded limits interpretation.`}
          />
        )}
      </div>
      <p style={{ fontFamily: COLORS.mono, fontSize: "0.9rem", color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.75rem' }}>
        Source: MoJ Prison Population Data Tool · HMPPS Offender Management Statistics
      </p>
    </div>
  );
}
