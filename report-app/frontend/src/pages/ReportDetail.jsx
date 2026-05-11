import React, { useEffect, useState } from 'react';
import { getReportItem } from '../api/reportApi';
import { useParams, Link } from 'react-router-dom';
import TrendBadge from '../components/TrendBadge';
import ErrorBanner from '../components/ErrorBanner';

export default function ReportDetail() {
  const { rank } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getReportItem(rank)
      .then(setItem)
      .catch(() => setError('Failed to load report item'));
  }, [rank]);

  if (error) return <ErrorBanner message={error} />;
  if (!item) return <div>Loading...</div>;

  return (
    <div className="report-detail">
      <Link to="/">← Back to List</Link>
      <h2>Rank {item.Rank}: {item.Topic}</h2>
      <div><b>Sector:</b> {item.Sector}</div>
      <div><b>Timeline / Years:</b> {item.Timeline_Years}</div>
      <div><b>Trend:</b> <TrendBadge trend={item.Trend} /></div>
      <div style={{ margin: '1em 0', background: '#f6f6f6', padding: '1em', borderRadius: 8 }}>
        <b>Before vs After:</b><br />
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{item.Before_vs_After}</pre>
      </div>
      <div style={{ margin: '1em 0', background: '#f6f6f6', padding: '1em', borderRadius: 8 }}>
        <b>Key Stats:</b><br />
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{item.Key_Stats}</pre>
      </div>
      <div style={{ margin: '1em 0' }}>
        <b>Detailed Summary:</b>
        <div>{item.Detailed_Summary}</div>
      </div>
      {item.Website_Link && <div><a href={item.Website_Link} target="_blank" rel="noopener noreferrer">Website Link</a></div>}
    </div>
  );
}
