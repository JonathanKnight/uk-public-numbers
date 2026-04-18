import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, LabelList, ResponsiveContainer,
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

const BAR_COLORS = ['#e8a090', '#d35400', '#c0392b'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
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
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{d.label}</div>
      <div style={{ color: COLORS.accent, marginBottom: '0.2rem' }}>
        {d.pct_population.toFixed(2)}% of population
      </div>
      <div style={{ color: COLORS.inkMuted, marginBottom: '0.1rem' }}>
        ≈{(Math.round(d.people / 1000) * 1000).toLocaleString()} people
      </div>
      <div style={{ color: COLORS.inkFaint, fontSize: '0.85rem' }}>
        {d.pct_reoffenders.toFixed(1)}% of proven reoffenders
      </div>
    </div>
  );
};

function interpolateThreshold(curve, targetPct) {
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1], curr = curve[i];
    if (prev.pct_reoffences < targetPct && curr.pct_reoffences >= targetPct) {
      const t = (targetPct - prev.pct_reoffences) / (curr.pct_reoffences - prev.pct_reoffences);
      return prev.pct_offenders + t * (curr.pct_offenders - prev.pct_offenders);
    }
  }
  return null;
}

const EW_POP = 60_900_000;

export default function CrimeConcentrationChart({ byPreviousOffences, prosecutedTotal }) {
  if (!byPreviousOffences?.data?.length) return null;

  const sorted = [...byPreviousOffences.data].sort((a, b) => b.rate - a.rate);
  const curve = [{ pct_offenders: 0, pct_reoffences: 0 }];
  let cumOff = 0, cumReoff = 0;
  for (const d of sorted) {
    cumOff   += d.pct_of_offenders;
    cumReoff += d.pct_of_reoffences;
    curve.push({ pct_offenders: cumOff, pct_reoffences: cumReoff });
  }

  const offenderBase = prosecutedTotal ?? 1_349_178;

  const bars = [25, 50, 75].map((target, i) => {
    const pctOff = interpolateThreshold(curve, target);
    const people  = pctOff != null ? Math.round((pctOff / 100) * offenderBase) : null;
    const pctPop  = people != null ? (people / EW_POP) * 100 : null;
    return {
      label:           `${target}% of crimes`,
      pct_reoffenders: pctOff != null ? parseFloat(pctOff.toFixed(1)) : null,
      people,
      pct_population:  pctPop != null ? parseFloat(pctPop.toFixed(3)) : null,
      color:           BAR_COLORS[i],
    };
  }).filter(d => d.pct_population != null);

  const maxVal = Math.max(...bars.map(d => d.pct_population));

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={bars} margin={{ top: 32, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkMuted }}
            tickLine={false}
            axisLine={{ stroke: COLORS.paperRule }}
          />
          <YAxis
            tickFormatter={v => `${v.toFixed(1)}%`}
            tick={{ fontFamily: COLORS.mono, fontSize: 14, fill: COLORS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={[0, parseFloat((maxVal * 1.35).toFixed(3))]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: COLORS.paperRule, opacity: 0.5 }} />
          <Bar dataKey="pct_population" maxBarSize={100} radius={[2, 2, 0, 0]}>
            {bars.map((d) => (
              <Cell key={d.label} fill={d.color} fillOpacity={0.85} />
            ))}
            <LabelList
              dataKey="people"
              position="top"
              formatter={v => `≈${(Math.round(v / 1000) * 1000).toLocaleString()}`}
              style={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkMuted, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.9rem', color: COLORS.inkFaint, letterSpacing: '0.03em', marginTop: '0.5rem', lineHeight: 1.6 }}>
        Source: MoJ Proven Reoffending Statistics {byPreviousOffences.period} · MoJ Criminal Justice Statistics · ONS mid-year population estimate 2023 ·
        Concentration ratios derived from the prolific offender breakdown, applied to total people prosecuted (~1.35M) as the offender base.
        Covers only detected crime — the true concentration is likely higher.
      </p>
    </div>
  );
}
