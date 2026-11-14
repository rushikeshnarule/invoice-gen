import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LicenseProvider, useLicense } from '../context/LicenseContext';
import { LicenseActivationGate } from '../components/LicenseGate/LicenseActivationGate';
import { App } from '../App';

describe('Strict Adobe-Grade License Activation Gate Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // Default fast-mock fetch so tests never hang on network timeouts
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.reject(new Error('Network offline in unit test'))
    );
  });

  it('renders LicenseActivationGate when license is unregistered or empty', async () => {
    render(
      <LicenseProvider>
        <LicenseActivationGate />
      </LicenseProvider>
    );

    expect(screen.getByText('Commercial License Required')).toBeInTheDocument();
    expect(screen.getByText(/Target Workstation Hardware/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activate & Unlock Workstation/i })).toBeInTheDocument();
  });

  it('shows error if submitted with empty key', async () => {
    render(
      <LicenseProvider>
        <LicenseActivationGate />
      </LicenseProvider>
    );

    const activateBtn = screen.getByRole('button', { name: /Activate & Unlock Workstation/i });
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid commercial license key/i)).toBeInTheDocument();
    });
  });

  it('shows error if submitted with invalid key', async () => {
    render(
      <LicenseProvider>
        <LicenseActivationGate />
      </LicenseProvider>
    );

    const input = screen.getByPlaceholderText('INVG-PRO-YYYYMMDD-XXXX');
    fireEvent.change(input, { target: { value: 'INVALID-KEY-1234' } });

    const activateBtn = screen.getByRole('button', { name: /Activate & Unlock Workstation/i });
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(screen.getByText(/invalid/i)).toBeInTheDocument();
    });
  });

  it('successfully unlocks when a valid sample commercial key is selected and submitted', async () => {
    const TestComponent = () => {
      const { isActivated, license } = useLicense();
      if (!isActivated) {
        return <LicenseActivationGate />;
      }
      return <div data-testid="unlocked-view">Unlocked: {license.tier}</div>;
    };

    render(
      <LicenseProvider>
        <TestComponent />
      </LicenseProvider>
    );

    expect(screen.getByText('Commercial License Required')).toBeInTheDocument();

    // Enter valid commercial key into input
    const input = screen.getByPlaceholderText('INVG-PRO-YYYYMMDD-XXXX');
    fireEvent.change(input, { target: { value: 'INVG-PRO-20271231-A9F4' } });

    const activateBtn = screen.getByRole('button', { name: /Activate & Unlock Workstation/i });
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(screen.getByTestId('unlocked-view')).toBeInTheDocument();
      expect(screen.getByText(/Unlocked: Commercial Pro/i)).toBeInTheDocument();
    });
  });

  it('completely gates App on launch when localStorage has no active license', async () => {
    render(<App />);

    // Invoices / Clients navigation should not be rendered; activation gate should block access
    await waitFor(() => {
      expect(screen.getByText('Commercial License Required')).toBeInTheDocument();
    });
    expect(screen.queryByText('Invoices')).not.toBeInTheDocument();
    expect(screen.queryByText('Templates')).not.toBeInTheDocument();
  });
});
