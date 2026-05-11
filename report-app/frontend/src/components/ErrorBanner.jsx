import React from 'react';

export default function ErrorBanner({ message }) {
  if (!message) return null;
  return <div style={{ background: '#fdd', color: '#900', padding: '1em', margin: '1em 0', borderRadius: '4px' }}>{message}</div>;
}
