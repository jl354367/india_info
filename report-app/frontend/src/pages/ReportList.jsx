import React, { useEffect, useState } from 'react';
import { getReportItems, getReportMetadata, refreshReport } from '../api/reportApi';
import Filters from '../components/Filters';
import ReportTable from '../components/ReportTable';
import ErrorBanner from '../components/ErrorBanner';
import { useNavigate } from 'react-router-dom';

export default function ReportList() {
  const [items, setItems] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [sector, setSector] = useState('');
  const [trend, setTrend] = useState('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getReportMetadata().then(setMetadata).catch(() => {});
  }, []);

  useEffect(() => {
    setError('');
    getReportItems({ sector, trend, q, limit, offset })
      .then(data => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => setError('Failed to load report data'));
  }, [sector, trend, q, limit, offset]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    setSuccess('');
    try {
      await refreshReport();
      setSuccess('Data refreshed!');
      getReportItems({ sector, trend, q, limit, offset }).then(data => {
        setItems(data.items);
        setTotal(data.total);
      });
    } catch {
      setError('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const sectorOptions = Array.from(new Set(items.map(i => i.Sector))).filter(Boolean);
  const trendOptions = Array.from(new Set(items.map(i => i.Trend))).filter(Boolean);

  return (
    <div>
      <h1>India Improvement Index Report</h1>
      <button onClick={handleRefresh} disabled={refreshing}>{refreshing ? 'Refreshing...' : 'Refresh'}</button>
      {success && <div style={{ color: 'green', margin: '1em 0' }}>{success}</div>}
      <ErrorBanner message={error} />
      <Filters sector={sector} setSector={setSector} trend={trend} setTrend={setTrend} q={q} setQ={setQ} sectorOptions={sectorOptions} trendOptions={trendOptions} />
      <ReportTable items={items} onRowClick={rank => navigate(`/report/${rank}`)} />
      <div style={{ marginTop: 16 }}>
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Prev</button>
        <span style={{ margin: '0 1em' }}>Page {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit) || 1}</span>
        <button disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>Next</button>
      </div>
      {metadata && <div style={{ marginTop: 16, fontSize: '0.9em', color: '#666' }}>
        Last refresh: {metadata.lastRefreshTime} | Rows: {metadata.rowCount}
      </div>}
    </div>
  );
}
