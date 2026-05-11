import React from 'react';

export default function Filters({ sector, setSector, trend, setTrend, q, setQ, sectorOptions, trendOptions }) {
  return (
    <div className="filters">
      <select value={sector} onChange={e => setSector(e.target.value)}>
        <option value="">All Sectors</option>
        {sectorOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <select value={trend} onChange={e => setTrend(e.target.value)}>
        <option value="">All Trends</option>
        {trendOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <input type="text" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} />
    </div>
  );
}
