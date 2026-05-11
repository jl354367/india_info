import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ReportList from './pages/ReportList';
import ReportDetail from './pages/ReportDetail';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ReportList />} />
      <Route path="/report/:rank" element={<ReportDetail />} />
    </Routes>
  );
}
