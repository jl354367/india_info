import React from 'react';

export default function ReportTable({ items, onRowClick }) {
  return (
    <table className="report-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Sector</th>
          <th>Topic</th>
          <th>Website Link</th>
          <th>Trend</th>
          <th>Timeline / Years</th>
          <th>Before vs After</th>
          <th>Key Stats</th>
          <th>Detailed Summary</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.Rank} onClick={() => onRowClick(item.Rank)} style={{ cursor: 'pointer' }}>
            <td>{item.Rank}</td>
            <td>{item.Sector}</td>
            <td>{item.Topic}</td>
            <td onClick={e => e.stopPropagation()}>
              {item.Website_Link ? (
                <a href={item.Website_Link} target="_blank" rel="noopener noreferrer">Link</a>
              ) : ''}
            </td>
            <td>{item.Trend}</td>
            <td>{item.Timeline_Years}</td>
            <td><pre style={{margin:0,whiteSpace:'pre-wrap'}}>{item.Before_vs_After}</pre></td>
            <td><pre style={{margin:0,whiteSpace:'pre-wrap'}}>{item.Key_Stats}</pre></td>
            <td style={{maxWidth:300,whiteSpace:'pre-wrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.Detailed_Summary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
