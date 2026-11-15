import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { InvoiceProvider, useInvoices } from './context/InvoiceContext';
import { LicenseProvider, useLicense } from './context/LicenseContext';
import { LicenseActivationGate } from './components/LicenseGate/LicenseActivationGate';
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
import { UpdateBanner } from './components/application/updates/UpdateBanner';

// Remix Icons
import {
  RiPaletteLine,
  RiFileTextLine,
  RiUserSharedLine,
} from '@remixicon/react';

const SaasAppShell: React.FC = () => {
  const { isActivated } = useLicense();
  const location = useLocation();
  const navigate = useNavigate();
  const isPrint = location.pathname.startsWith('/print');
  const { invoices, businessProfile, hasCompletedSetup, completeSetup, importOfflineBackup } = useInvoices();
  const [templateCount, setTemplateCount] = useState(() => getAllThemes().length);

  // File association listener: opens .inv, .invoice, .json documents passed by OS double-click
  useEffect(() => {
    const desktop = (window as unknown as { invoiceDesktop?: { getOpenedFile?: () => Promise<{ success: boolean; content?: string }> } }).invoiceDesktop;
    if (desktop?.getOpenedFile) {
      desktop.getOpenedFile().then((res) => {
        if (res?.success && res.content) {
          importOfflineBackup(res.content);
        }
      }).catch(() => {});
    }
  }, [importOfflineBackup]);

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

  // ─── STRICT ADOBE-GRADE COMMERCIAL LICENSE ACTIVATION GATE ───
  // If no active commercial license key is registered, lock the entire workstation immediately.
  if (!isActivated) {
    return <LicenseActivationGate />;
  }

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
    <div className="flex flex-col md:flex-row h-dvh w-screen overflow-hidden bg-background-full p-0 md:p-3 gap-0 md:gap-3">
      {/* ─── DESKTOP FLOATING SIDEBAR (HIDDEN ON MOBILE) ─── */}
      <div className="hidden md:flex shrink-0">
        <DashboardSidebar
          selected={activeKey}
          items={navItems}
          showThemeToggle={false}
        />
      </div>

      {/* ─── MAIN WORKSPACE CONTAINER ─── */}
      <main className="flex-1 overflow-hidden flex flex-col rounded-none md:rounded-3xl border-0 md:border border-slate-200/80 bg-white shadow-sidebar pb-16 md:pb-0">
        <UpdateBanner />
        <Routes>
          <Route path="/" element={<InvoicesView />} />
          <Route path="/invoices" element={<InvoicesView />} />
          <Route path="/design" element={<ThemePicker />} />
          <Route path="/settings/design" element={<ThemePicker />} />
          <Route path="/clients" element={<ClientsView />} />
          <Route path="*" element={<Navigate to="/invoices" replace />} />
        </Routes>
      </main>

      {/* ─── NATIVE MOBILE BOTTOM NAVIGATION BAR ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around py-1.5 px-3 md:hidden shadow-lg safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition-all relative ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`size-5.5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge !== undefined && Boolean(item.badge) && (
                  <span className="absolute -top-1 -right-2.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center leading-tight">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <LicenseProvider>
        <InvoiceProvider>
          <ThemeProvider>
            <SaasAppShell />
            <Toaster />
          </ThemeProvider>
        </InvoiceProvider>
      </LicenseProvider>
    </BrowserRouter>
  );
}

export default App;
