import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ReportList from './pages/ReportList';
import ReportDetail from './pages/ReportDetail';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ReportList />} />
        <Route path="/report/:rank" element={<ReportDetail />} />
      </Routes>
    </Router>
  );
}
