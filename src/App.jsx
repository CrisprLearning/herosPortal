import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import StudentProvider from './components/StudentProvider';
import ToastProvider from './components/Toast';
import LoginPage from './pages/LoginPage';
import Student360Page from './pages/Student360Page';
import CoursesPage from './pages/CoursesPage';
import HostelPage from './pages/HostelPage';
import ContactsPage from './pages/ContactsPage';
import { isAuthenticated } from './lib/auth';

const DEFAULT_ROUTE = '/student-360';

function Protected({ children }) {
  if (!isAuthenticated()) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return (
    <StudentProvider>
      <Layout>{children}</Layout>
    </StudentProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/student-360" element={<Protected><Student360Page /></Protected>} />
        <Route path="/courses" element={<Protected><CoursesPage /></Protected>} />
        <Route path="/hostel" element={<Protected><HostelPage /></Protected>} />
        <Route path="/contacts" element={<Protected><ContactsPage /></Protected>} />
        <Route path="/" element={<Navigate to={DEFAULT_ROUTE} replace />} />
        <Route path="*" element={<Navigate to={DEFAULT_ROUTE} replace />} />
      </Routes>
    </ToastProvider>
  );
}
