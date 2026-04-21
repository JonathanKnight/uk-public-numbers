import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink: '#1a1208', inkMuted: '#5c5240', inkFaint: '#9c8e7e',
  paper: '#faf7f2', paperRule: '#e8e0d0',
  ug: '#1a4a7a', pg: '#c0392b',
  ugRG: '#2a6aaa', pgRG: '#e05030',
  mono: '"JetBrains Mono", monospace',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.paperRule}`, borderLeft: `3px solid ${COLORS.inkFaint}`, padding: '0.6rem 0.9rem', fontFamily: COLORS.mono, fontSize: '0.9rem', color: COLORS.inkMuted }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: £{p.value.toLocaleString()}
        </div>
      ))}
    </div>
  );
};

export default function GraduateSalariesChart({ subjects }) {
  if (!subjects?.length) return null;

  const order = ['Medicine & health', 'STEM', 'Business', 'Law', 'Languages', 'Humanities'];
  const sorted = [...subjects].sort((a, b) => order.indexOf(a.subject) - order.indexOf(b.subject));

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: COLORS.mono, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: COLORS.inkFaint, marginBottom: '0.75rem' }}>
            All UK graduates · median annual salary 15 months post-graduation
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart layout="vertical" data={sorted} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} horizontal={false} />
              <XAxis type="number" tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint }} tickLine={false} axisLine={{ stroke: COLORS.paperRule }} domain={[0, 55000]} />
              <YAxis type="category" dataKey="subject" tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkMuted }} tickLine={false} axisLine={false} width={120} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: COLORS.paperRule, opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontFamily: COLORS.mono, fontSize: '0.75rem', paddingTop: '0.5rem' }} />
              <Bar dataKey="ug_median"  name="Undergraduate" fill={COLORS.ug} fillOpacity={0.85} maxBarSize={18} radius={[0, 2, 2, 0]} />
              <Bar dataKey="pgt_median" name="Postgraduate taught" fill={COLORS.pg} fillOpacity={0.85} maxBarSize={18} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: COLORS.mono, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: COLORS.inkFaint, marginBottom: '0.75rem' }}>
            Russell Group graduates · median annual salary 15 months post-graduation
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart layout="vertical" data={sorted} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} horizontal={false} />
              <XAxis type="number" tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkFaint }} tickLine={false} axisLine={{ stroke: COLORS.paperRule }} domain={[0, 65000]} />
              <YAxis type="category" dataKey="subject" tick={{ fontFamily: COLORS.mono, fontSize: 12, fill: COLORS.inkMuted }} tickLine={false} axisLine={false} width={120} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: COLORS.paperRule, opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontFamily: COLORS.mono, fontSize: '0.75rem', paddingTop: '0.5rem' }} />
              <Bar dataKey="ug_rg_median"  name="Undergraduate (RG)" fill={COLORS.ugRG} fillOpacity={0.85} maxBarSize={18} radius={[0, 2, 2, 0]} />
              <Bar dataKey="pgt_rg_median" name="Postgraduate taught (RG)" fill={COLORS.pgRG} fillOpacity={0.85} maxBarSize={18} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.85rem', color: COLORS.inkFaint, marginTop: '0.5rem' }}>
        HESA Graduate Outcomes survey 2021–22 · UK graduates in full-time employment · median salary 15 months after graduation · RG figures estimated from provider-level Graduate Outcomes data
      </p>
    </div>
  );
}
