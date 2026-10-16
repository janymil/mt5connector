import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing.jsx';
import Auth from './components/Auth.jsx';
import Dashboard from './components/Dashboard.jsx';
import HelpFAQ from './components/HelpFAQ.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/help" element={<HelpFAQ />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
