import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { InvoiceProvider, useInvoices } from './context/InvoiceContext';
import { getAllThemes } from './themes';
import { initAutoSyncListener, REMOTE_TEMPLATES_UPDATED_EVENT } from './services/templateSyncService';
import { ThemePicker } from './components/ThemePicker/ThemePicker';
import { InvoicesView } from './routes/InvoicesView';
import { ClientsView } from './routes/ClientsView';
import { PrintInvoice } from './routes/PrintInvoice';
import { SetupScreen } from './components/SetupScreen/SetupScreen';
import {
  DashboardSidebar,
  type DashboardNavItem,
} from './components/application/dashboard/dashboard-sidebar';
import { Toaster } from '@/components/base/toast/toast';

// Remix Icons
import {
  RiPaletteLine,
  RiFileTextLine,
  RiUserSharedLine,
} from '@remixicon/react';

const SaasAppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isPrint = location.pathname.startsWith('/print');
  const { invoices, businessProfile, hasCompletedSetup, completeSetup } = useInvoices();
  const [templateCount, setTemplateCount] = useState(() => getAllThemes().length);

  // Background auto-sync listener when internet connects
  useEffect(() => {
    const cleanup = initAutoSyncListener((result) => {
      if (result.success && (result.totalCount ?? 0) > 0) {
        setTemplateCount(getAllThemes().length);
      }
    });

    const handleUpdate = () => setTemplateCount(getAllThemes().length);
    window.addEventListener(REMOTE_TEMPLATES_UPDATED_EVENT, handleUpdate);

    return () => {
      cleanup();
      window.removeEventListener(REMOTE_TEMPLATES_UPDATED_EVENT, handleUpdate);
    };
  }, []);

  if (isPrint) {
    return (
      <Routes>
        <Route path="/print/:invoiceId" element={<PrintInvoice />} />
      </Routes>
    );
  }

  // Initial business setup wizard & step-by-step loading initialization
  if (!hasCompletedSetup) {
    const isRealProfile = businessProfile.name && !businessProfile.name.includes('Apex Infotech');
    return (
      <SetupScreen
        onComplete={completeSetup}
        initialProfile={isRealProfile ? businessProfile : undefined}
      />
    );
  }

  // Active navigation key
  const activeKey = location.pathname === '/' || location.pathname.includes('/invoices')
    ? 'invoices'
    : location.pathname.includes('/clients')
    ? 'clients'
    : 'design';

  // Primary Navigation Items
  const navItems: DashboardNavItem[] = [
    {
      key: 'invoices',
      label: 'Invoices',
      icon: RiFileTextLine,
      href: '/invoices',
      badge: invoices.length,
      onClick: () => navigate('/invoices'),
    },
    {
      key: 'design',
      label: 'Templates',
      icon: RiPaletteLine,
      href: '/design',
      badge: templateCount,
      onClick: () => navigate('/design'),
    },
    {
      key: 'clients',
      label: 'Clients',
      icon: RiUserSharedLine,
      href: '/clients',
      onClick: () => navigate('/clients'),
    },
  ];

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-background-full p-3 gap-3">
      {/* ─── OFFICIAL BOARDUI FLOATING DASHBOARD SIDEBAR ─── */}
      <DashboardSidebar
        selected={activeKey}
        items={navItems}
        showThemeToggle={false}
      />

      {/* ─── MAIN SAAS WORKSPACE CONTAINER ─── */}
      <main className="flex-1 overflow-hidden flex flex-col rounded-3xl border border-slate-200/80 bg-white shadow-sidebar">
        <Routes>
          <Route path="/" element={<InvoicesView />} />
          <Route path="/invoices" element={<InvoicesView />} />
          <Route path="/design" element={<ThemePicker />} />
          <Route path="/settings/design" element={<ThemePicker />} />
          <Route path="/clients" element={<ClientsView />} />
          <Route path="*" element={<Navigate to="/invoices" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <InvoiceProvider>
        <ThemeProvider>
          <SaasAppShell />
          <Toaster />
        </ThemeProvider>
      </InvoiceProvider>
    </BrowserRouter>
  );
}

export default App;
