import React from 'react';

export default function TrendBadge({ trend }) {
  if (!trend) return null;
  let color = 'gray';
  if (trend.includes('↑')) color = 'green';
  if (trend.includes('↓')) color = 'red';
  return <span style={{ background: color, color: 'white', padding: '0.2em 0.6em', borderRadius: '0.5em', fontWeight: 'bold' }}>{trend}</span>;
}
