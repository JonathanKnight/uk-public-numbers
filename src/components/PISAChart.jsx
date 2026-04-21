import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  ink:       '#1a1208',
  inkMuted:  '#5c5240',
  inkFaint:  '#9c8e7e',
  paper:     '#faf7f2',
  paperRule: '#e8e0d0',
  reading:   '#1a4a7a',
  maths:     '#c0392b',
  science:   '#1a6b3a',
  mono:      '"JetBrains Mono", monospace',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: COLORS.paper, border: `1px solid ${COLORS.paperRule}`,
      borderLeft: `3px solid ${COLORS.inkFaint}`, padding: '0.6rem 0.9rem',
      fontFamily: COLORS.mono, fontSize: '0.9rem', color: COLORS.inkMuted,
    }}>
      <div style={{ color: COLORS.ink, fontWeight: 600, marginBottom: '0.3rem' }}>PISA {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.stroke }}>
          {p.name}: {p.value}{p.name.includes('score') ? '' : 'th'}
        </div>
      ))}
    </div>
  );
};

function RankChart({ data }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: COLORS.mono, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: COLORS.inkFaint, marginBottom: '0.75rem' }}>
        Global rank (lower = better) · out of all participating systems
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint }}
            tickLine={false} axisLine={{ stroke: COLORS.paperRule }}
          />
          <YAxis
            reversed={true}
            domain={[1, 32]}
            tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint }}
            tickLine={false} axisLine={false} width={28}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontFamily: COLORS.mono, fontSize: '0.75rem', paddingTop: '0.5rem' }} />
          <Line type="monotone" dataKey="reading_rank" name="Reading" stroke={COLORS.reading} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.reading, strokeWidth: 0 }} />
          <Line type="monotone" dataKey="maths_rank"   name="Maths"   stroke={COLORS.maths}   strokeWidth={2.5} dot={{ r: 4, fill: COLORS.maths,   strokeWidth: 0 }} />
          <Line type="monotone" dataKey="science_rank" name="Science" stroke={COLORS.science} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.science, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ScoreChart({ data }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: COLORS.mono, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: COLORS.inkFaint, marginBottom: '0.75rem' }}>
        Score (OECD average = 500)
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.paperRule} vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint }}
            tickLine={false} axisLine={{ stroke: COLORS.paperRule }}
          />
          <YAxis
            domain={[480, 525]}
            tick={{ fontFamily: COLORS.mono, fontSize: 13, fill: COLORS.inkFaint }}
            tickLine={false} axisLine={false} width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontFamily: COLORS.mono, fontSize: '0.75rem', paddingTop: '0.5rem' }} />
          <Line type="monotone" dataKey="reading_score" name="Reading score" stroke={COLORS.reading} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.reading, strokeWidth: 0 }} />
          <Line type="monotone" dataKey="maths_score"   name="Maths score"   stroke={COLORS.maths}   strokeWidth={2.5} dot={{ r: 4, fill: COLORS.maths,   strokeWidth: 0 }} />
          <Line type="monotone" dataKey="science_score" name="Science score" stroke={COLORS.science} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.science, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PISAChart({ series }) {
  if (!series?.length) return null;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
        <RankChart data={series} />
        <ScoreChart data={series} />
      </div>
      <p style={{ fontFamily: COLORS.mono, fontSize: '0.85rem', color: COLORS.inkFaint, marginTop: '0.5rem' }}>
        England only (Scotland, Wales, and Northern Ireland participate separately) · OECD PISA, conducted every 3 years · 15-year-olds
      </p>
    </div>
  );
}
