import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SetupScreen } from '../components/SetupScreen/SetupScreen';
import { ShareInvoiceModal } from '../components/ShareInvoiceModal/ShareInvoiceModal';
import { createSampleData } from '../utils/sampleData';

describe('SetupScreen & Step-by-Step Initialization', () => {
  it('renders Step 1 with BoardUI inputs and validates that business name is required', () => {
    const onComplete = vi.fn();
    render(<SetupScreen onComplete={onComplete} />);

    expect(screen.getByText(/Business Setup/i)).toBeInTheDocument();
    expect(screen.getByText(/Commercial Mode/i)).toBeInTheDocument();

    // Click Next Step without entering a business name
    const nextBtn = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText(/Business name is required/i)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('allows entering real commercial details and navigating steps 1 -> 2 -> 3', () => {
    const onComplete = vi.fn();
    render(<SetupScreen onComplete={onComplete} />);

    // Enter real commercial business name
    const nameInput = screen.getByPlaceholderText(/e\.g\. Knot8 Technologies/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Knot8 Technologies' } });
    expect(nameInput.value).toBe('Knot8 Technologies');

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    expect(screen.getByText(/Location & Tax/i)).toBeInTheDocument();

    // Enter real commercial address
    const addressInput = screen.getByPlaceholderText(/Street address, building, or commercial area/i) as HTMLInputElement;
    fireEvent.change(addressInput, { target: { value: '101 Tech Center' } });

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    expect(screen.getByText(/Banking & Remittance/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Finish & Start Software/i })).toBeInTheDocument();
  });

  it('runs the step-by-step loading sequence and calls onComplete with finalized profile', async () => {
    const onComplete = vi.fn();
    render(
      <SetupScreen
        onComplete={onComplete}
        initialProfile={{
          name: 'Knot8 Technologies',
          email: 'knot8technologies@gmail.com',
          phone: '+917249002129',
          bankDetails: {
            bankName: 'Axis Bank',
            accountName: 'Knot8 Technologies',
            accountNumber: '912000345678',
            ifsc: 'UTIB0001234',
            upiId: 'knot8@axisbank',
          },
        }}
        stepDelayMs={20} // fast execution for tests
      />
    );

    // Navigate to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    // Navigate to Step 3
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

    // Click Finish & Start Software to enter the step-by-step loading screen
    const finishBtn = screen.getByRole('button', { name: /Finish & Start Software/i });
    fireEvent.click(finishBtn);

    // Loading screen should now be visible
    expect(screen.getByText(/Initializing Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/Saving business profile and contact information/i)).toBeInTheDocument();

    // Wait for the sequential checklist steps to finish
    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 }
    );

    const receivedProfile = onComplete.mock.calls[0][0];
    expect(receivedProfile.name).toBe('Knot8 Technologies');
    expect(receivedProfile.email).toBe('knot8technologies@gmail.com');
    expect(receivedProfile.bankDetails?.upiId).toBe('knot8@axisbank');
  });

  it('provides two setup choices: configure new business and restore previous session / memory', () => {
    const onComplete = vi.fn();
    render(<SetupScreen onComplete={onComplete} />);

    // Check that both option tabs are present
    expect(screen.getByText(/1\. Configure Business Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Load From Previous Session \/ Memory/i)).toBeInTheDocument();

    // Click on option 2: Load From Previous Session / Memory
    fireEvent.click(screen.getByText(/2\. Load From Previous Session \/ Memory/i));

    // Restore view should now be displayed with PC memory and JSON backup import
    expect(screen.getByText(/Restore From Local Documents/i)).toBeInTheDocument();
    expect(screen.getByText(/Import JSON Backup/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Upload a file/i)).toBeInTheDocument();

    // Can switch back to wizard
    fireEvent.click(screen.getByText(/Or Start Setup Wizard Instead/i));
    expect(screen.getByPlaceholderText(/e\.g\. Knot8 Technologies/i)).toBeInTheDocument();
  });
});

describe('ShareInvoiceModal', () => {
  let openSpy: ReturnType<typeof vi.spyOn>;
  let clipboardSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    clipboardSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardSpy,
      },
    });
  });

  afterEach(() => {
    openSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('renders invoice details, total, and sharing options', () => {
    const sample = createSampleData(2);
    sample.invoiceNumber = 'INV-SHARE-001';
    sample.status = 'sent';
    sample.balanceDue = 950;

    render(
      <ShareInvoiceModal
        isOpen={true}
        onClose={vi.fn()}
        invoice={sample}
        themeId="modern"
      />
    );

    expect(screen.getByText('Share Invoice')).toBeInTheDocument();
    expect(screen.getByText('INV-SHARE-001')).toBeInTheDocument();
    expect(screen.getByText('Share on WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Send via Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy Link/i })).toBeInTheDocument();
  });

  it('opens WhatsApp share URL with pre-formatted invoice message on click', () => {
    const sample = createSampleData(1);
    sample.invoiceNumber = 'INV-WA-777';
    sample.client.phone = '+91 98765 43210';
    sample.bankDetails = {
      ...sample.bankDetails,
      bankName: 'HDFC Bank',
      accountName: 'Sample Merchant',
      accountNumber: '1234567890',
      ifsc: 'HDFC0001234',
      upiId: 'merchant@upi',
    };

    render(
      <ShareInvoiceModal
        isOpen={true}
        onClose={vi.fn()}
        invoice={sample}
        themeId="classic"
      />
    );

    const waBtn = screen.getByText('Share on WhatsApp');
    fireEvent.click(waBtn);

    expect(openSpy).toHaveBeenCalledTimes(1);
    const waUrl = openSpy.mock.calls[0][0] as string;
    expect(waUrl).toContain('https://wa.me/919876543210');
    expect(waUrl).toContain('INV-WA-777');
  });

  it('copies printable invoice link to clipboard on clicking Copy Link', async () => {
    const sample = createSampleData(1);
    sample.invoiceNumber = 'INV-CLIPBOARD-123';

    render(
      <ShareInvoiceModal
        isOpen={true}
        onClose={vi.fn()}
        invoice={sample}
        themeId="corporate"
      />
    );

    const copyBtn = screen.getByRole('button', { name: /Copy Link/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(clipboardSpy).toHaveBeenCalledTimes(1);
      expect(clipboardSpy.mock.calls[0][0]).toContain('/print/INV-CLIPBOARD-123?theme=corporate&auto=true');
    });
  });
});
