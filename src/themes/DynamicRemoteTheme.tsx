import React from 'react';
import type { ThemeComponentProps, RemoteTemplateDefinition } from '../types';
import { Watermark } from './Watermark';
import { themeVars, getUpiQrString } from './themeHelpers';
import { formatCurrency, formatNumber, formatDate, QRCodeView, amountInWords } from '../utils';

export interface DynamicRemoteThemeProps extends ThemeComponentProps {
  templateDef?: RemoteTemplateDefinition;
}

export const DynamicRemoteTheme: React.FC<DynamicRemoteThemeProps> = ({ data, options, templateDef }) => {
  const showGst = data.gstType !== 'none';
  const isInterState = data.gstType === 'igst';
  const isThermal = options.paper === '80mm';
  const paperClass = isThermal ? 'paper-thermal' : `paper-${options.paper.toLowerCase()}`;

  const defaultBaseCss = `
    .remote-invoice-root {
      font-family: var(--font-family, system-ui, sans-serif);
      color: #1e293b;
      background: #ffffff;
      box-sizing: border-box;
      position: relative;
    }
    .remote-invoice-root.paper-a4 {
      width: 210mm;
      min-height: 297mm;
      padding: 16mm 18mm;
      margin: 0 auto;
    }
    .remote-invoice-root.paper-a5 {
      width: 148mm;
      min-height: 210mm;
      padding: 10mm 12mm;
      margin: 0 auto;
      font-size: 9pt;
    }
    .remote-invoice-root.paper-thermal {
      width: 76mm;
      padding: 4mm;
      margin: 0 auto;
      font-size: 8.5pt;
    }
    .remote-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--accent, #2563eb);
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .remote-logo {
      max-height: 54px;
      max-width: 180px;
      object-fit: contain;
      margin-bottom: 6px;
    }
    .remote-title {
      font-size: 20pt;
      font-weight: 800;
      color: var(--accent, #2563eb);
      letter-spacing: -0.5px;
    }
    .remote-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
      font-size: 9.5pt;
    }
    .remote-party-box {
      padding: 10px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .remote-party-title {
      font-size: 8pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .remote-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 9pt;
    }
    .remote-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid #cbd5e1;
    }
    .remote-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    .remote-summary-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 20px;
      margin-top: 12px;
    }
    .remote-totals-table {
      width: 100%;
      border-collapse: collapse;
    }
    .remote-totals-table td {
      padding: 4px 6px;
      font-size: 9pt;
    }
    .remote-grand-total {
      font-size: 13pt;
      font-weight: 800;
      color: var(--accent, #2563eb);
      border-top: 2px solid var(--accent, #2563eb);
      border-bottom: 2px solid var(--accent, #2563eb);
    }
    .remote-sign-container {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      justify-content: flex-end;
      min-height: 60px;
    }
    .remote-stamp-img {
      max-height: 65px;
      max-width: 90px;
      object-fit: contain;
      mix-blend-mode: multiply;
    }
    .remote-signature-img {
      max-height: 50px;
      max-width: 140px;
      object-fit: contain;
    }
  `;

  const customCss = templateDef?.cachedCss || '';

  const isContractor =
    templateDef?.layout === 'contractor' ||
    templateDef?.id === 'construction-contractor' ||
    templateDef?.id?.includes('contractor') ||
    templateDef?.id?.includes('construction');

  const contractorCss = `
    .contractor-invoice-root {
      border: 2px solid var(--accent, #0f172a);
      box-sizing: border-box;
      background: #ffffff;
      color: #000000;
      font-family: var(--font-family, system-ui, sans-serif);
      font-size: var(--font-size-base, 8.5pt);
      line-height: 1.35;
      position: relative;
    }
    .contractor-invoice-root.paper-a4 {
      width: 210mm;
      min-height: 297mm;
      padding: 12mm 14mm;
      margin: 0 auto;
    }
    .contractor-invoice-root.paper-a5 {
      width: 148mm;
      min-height: 210mm;
      padding: 8mm 9mm;
      margin: 0 auto;
      font-size: 7.5pt;
    }
    .contractor-invoice-root.paper-thermal,
    .contractor-invoice-root.paper-80mm {
      width: 76mm;
      padding: 4mm;
      margin: 0 auto;
      font-size: 7.5pt;
    }
    .contractor-header-box {
      text-align: center;
      border: 1.5px solid var(--accent, #0f172a);
      padding: 6px 0;
      font-size: 13pt;
      font-weight: 800;
      letter-spacing: 1.5px;
      margin-bottom: -1.5px;
      background: #f8fafc;
      color: var(--accent, #0f172a);
    }
    .contractor-meta-bar {
      display: flex;
      justify-content: space-between;
      border: 1.5px solid var(--accent, #0f172a);
      padding: 4px 8px;
      font-size: 8.5pt;
      margin-bottom: -1.5px;
      background: #fafafa;
    }
    .contractor-business-info {
      border: 1.5px solid var(--accent, #0f172a);
      padding: 8px 10px;
      text-align: center;
      margin-bottom: -1.5px;
      background: #ffffff;
    }
    .contractor-company-name {
      font-size: 13pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      text-transform: uppercase;
      color: var(--accent, #0f172a);
    }
    .contractor-company-address {
      font-size: 8pt;
      color: #1e293b;
      margin-bottom: 3px;
    }
    .contractor-inline-row {
      display: flex;
      justify-content: space-around;
      font-size: 8pt;
      margin-top: 2px;
    }
    .contractor-bank-bar {
      margin-top: 5px;
      padding: 4px 8px;
      border-top: 1px dashed #64748b;
      font-size: 7.5pt;
      background: #f8fafc;
      border-radius: 4px;
    }
    .contractor-buyer-section {
      border: 1.5px solid var(--accent, #0f172a);
      padding: 6px 10px;
      margin-bottom: -1.5px;
      background: #ffffff;
    }
    .contractor-section-heading {
      font-weight: 800;
      font-size: 8.5pt;
      text-transform: uppercase;
      margin-bottom: 3px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
      color: var(--accent, #0f172a);
    }
    .contractor-buyer-body {
      padding-top: 2px;
    }
    .contractor-buyer-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 3px;
      font-size: 8pt;
    }
    .contractor-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid var(--accent, #0f172a);
      font-size: 8pt;
    }
    .contractor-table th,
    .contractor-table td {
      border: 1px solid var(--accent, #0f172a);
      padding: 4px 5px;
    }
    .contractor-table th {
      background: #f1f5f9;
      font-weight: 800;
      text-align: left;
    }
    .contractor-total-row td {
      font-weight: 600;
      background: #ffffff;
    }
    .contractor-qty-total-row td {
      background: #f8fafc;
      font-weight: 700;
      border-top: 1.5px solid var(--accent, #0f172a);
    }
    .contractor-net-total-row td {
      background: var(--accent, #0f172a);
      color: #ffffff;
      font-weight: 900;
      border-top: 2px solid var(--accent, #0f172a);
      border-bottom: 2px solid var(--accent, #0f172a);
    }
    .contractor-words-box {
      border: 1.5px solid var(--accent, #0f172a);
      border-top: none;
      padding: 5px 8px;
      font-size: 8pt;
      background: #ffffff;
    }
    .contractor-tax-schedule {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid var(--accent, #0f172a);
      border-top: none;
      font-size: 7.5pt;
    }
    .contractor-tax-schedule th,
    .contractor-tax-schedule td {
      border: 1px solid var(--accent, #0f172a);
      padding: 3px 5px;
    }
    .contractor-tax-schedule th {
      background: #f8fafc;
      font-weight: 700;
    }
    .contractor-tax-words-box {
      border: 1.5px solid var(--accent, #0f172a);
      border-top: none;
      padding: 4px 8px;
      font-size: 7.5pt;
      background: #fcfcfc;
    }
    .contractor-footer-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      border: 1.5px solid var(--accent, #0f172a);
      border-top: none;
      min-height: 85px;
      background: #ffffff;
    }
    .contractor-declaration-box {
      padding: 6px 8px;
      border-right: 1.5px solid var(--accent, #0f172a);
      font-size: 7.5pt;
      color: #1e293b;
    }
    .contractor-signatory-box {
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: right;
    }
    .contractor-sign-for {
      font-size: 8pt;
      font-weight: 700;
    }
    .contractor-sign-assets {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      min-height: 42px;
    }
    .contractor-stamp-img {
      max-height: 45px;
      max-width: 65px;
      mix-blend-mode: multiply;
    }
    .contractor-signature-img {
      max-height: 38px;
      max-width: 95px;
    }
    .contractor-auth-label {
      font-size: 7.5pt;
      font-weight: 700;
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      display: inline-block;
      margin-left: auto;
    }
    @media print {
      .contractor-invoice-root {
        width: 100% !important;
        min-height: auto !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: 2px solid #000000 !important;
      }
      .contractor-net-total-row td {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;

  if (isContractor) {
    const primaryRate = data.taxSummary[0]?.gstRate || 5;
    const halfRate = (primaryRate / 2).toFixed(2);
    const totalQty = data.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const primaryUnit = data.items.find((i) => i.unit)?.unit || 'Brass';

    const showHsn = options.showHsnSacColumn !== false;
    const showDisc = options.showDiscountColumn !== false;
    const colCount = 6 + (showHsn ? 1 : 0) + (showDisc ? 1 : 0);
    const leftSpan = 2 + (showHsn ? 1 : 0);
    const middleSpan = 2 + (showDisc ? 1 : 0);

    const getHsnForRate = (gstRate: number): string => {
      const matching = data.items.filter((i) => (i.gstRate ?? primaryRate) === gstRate && i.hsnSac);
      if (matching.length > 0) {
        const unique = Array.from(new Set(matching.map((i) => i.hsnSac!.trim())));
        return unique.join(', ');
      }
      const anyHsn = data.items.find((i) => i.hsnSac)?.hsnSac;
      return anyHsn || '—';
    };

    return (
      <div
        className={`remote-invoice-root contractor-invoice-root ${paperClass} theme-remote-${templateDef?.id || 'construction-contractor'}`}
        style={themeVars(options)}
      >
        <style>{defaultBaseCss}</style>
        <style>{contractorCss}</style>
        {customCss && <style>{customCss}</style>}

        <Watermark options={options} status={data.status} />

        {/* 1. Centered TAX INVOICE Header Box */}
        <div className="contractor-header-box">
          {showGst ? 'TAX INVOICE' : 'INVOICE'}
        </div>

        {/* 2. Invoice No. & Dated */}
        <div className="contractor-meta-bar">
          <div><strong>Invoice No.:</strong> {data.invoiceNumber}</div>
          <div><strong>Dated:</strong> {formatDate(data.invoiceDate, options.numberFormat)}</div>
        </div>

        {/* 3. Contractor / Business Details */}
        <div className="contractor-business-info">
          {options.showLogo && (data.business?.logoUrl || data.logoUrl) && (
            <div
              style={{
                display: 'flex',
                justifyContent: options.logoPosition === 'left' ? 'flex-start' : options.logoPosition === 'right' ? 'flex-end' : 'center',
                marginBottom: '6px',
              }}
            >
              <img
                src={data.business?.logoUrl || data.logoUrl}
                alt={data.business.name}
                style={{ maxHeight: '48px', maxWidth: '160px', objectFit: 'contain' }}
              />
            </div>
          )}
          <div className="contractor-company-name">{data.business.name}</div>
          <div className="contractor-company-address">
            {data.business.address}, {data.business.city}, {data.business.state} – {data.business.pincode}
          </div>
          <div className="contractor-inline-row">
            <div><strong>GST TIN/UIN:</strong> {data.business.gstin || 'Unregistered'}</div>
            <div>
              <strong>State:</strong> {data.business.state} &nbsp;|&nbsp; <strong>Code:</strong> {data.business.gstin ? data.business.gstin.slice(0, 2) : '27'}
            </div>
          </div>
          <div className="contractor-inline-row">
            <div><strong>Contact:</strong> {data.business.phone || '—'}</div>
            <div><strong>E-Mail:</strong> {data.business.email || '—'}</div>
          </div>
          {options.showBankDetails && data.bankDetails && (
            <div className="contractor-bank-bar">
              <strong>Bank:</strong> {data.bankDetails.bankName} &nbsp;|&nbsp; 
              <strong>A/c:</strong> {data.bankDetails.accountNumber} &nbsp;|&nbsp; 
              <strong>IFSC:</strong> {data.bankDetails.ifsc} &nbsp;|&nbsp; 
              <strong>Branch:</strong> {data.bankDetails.branch || data.business.city}
              {data.bankDetails.upiId && <span> &nbsp;|&nbsp; <strong>UPI:</strong> {data.bankDetails.upiId}</span>}
            </div>
          )}
        </div>

        {/* 4. Buyer Details Section */}
        <div className="contractor-buyer-section">
          <div className="contractor-section-heading">Buyer Details</div>
          <div className="contractor-buyer-body">
            <div className="contractor-buyer-name">
              <strong>M/s:</strong> {data.client.name}
            </div>
            <div className="contractor-buyer-address">
              {data.client.address}, {data.client.city}, {data.client.state} – {data.client.pincode}
            </div>
            <div className="contractor-buyer-meta">
              <div><strong>GST TIN/UIN (Buyer):</strong> {data.client.gstin || 'Unregistered'}</div>
              <div><strong>Destination:</strong> {data.placeOfSupply || `${data.client.city}, ${data.client.state}`}</div>
            </div>
          </div>
        </div>

        {/* 5. Item Grid Table with dynamic column alignment */}
        <table className="contractor-table">
          <thead>
            <tr>
              <th style={{ width: '6%', textAlign: 'center' }}>Sr.<br/>No.</th>
              {showHsn && <th style={{ width: '12%', textAlign: 'center', whiteSpace: 'nowrap' }}>HSN/<br/>SAC</th>}
              <th>Description of Goods</th>
              <th style={{ width: '9%', textAlign: 'right' }}>Qty</th>
              <th style={{ width: '12%', textAlign: 'right' }}>Rate ({options.currencySymbol})</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Per</th>
              {showDisc && <th style={{ width: '8%', textAlign: 'right' }}>Disc.%</th>}
              <th style={{ width: '15%', textAlign: 'right' }}>Amount ({options.currencySymbol})</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ textAlign: 'center' }}>{item.sno || idx + 1}</td>
                {showHsn && (
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {item.hsnSac || '—'}
                  </td>
                )}
                <td><strong>{item.description}</strong></td>
                <td style={{ textAlign: 'right' }}>
                  {item.quantity ? formatNumber(item.quantity, options.numberFormat) : ''}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(item.rate, '', options.numberFormat)}
                </td>
                <td style={{ textAlign: 'center' }}>{item.unit || 'Brass'}</td>
                {showDisc && (
                  <td style={{ textAlign: 'right' }}>
                    {item.discount ? `${item.discount}%` : '—'}
                  </td>
                )}
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(item.taxableAmount, '', options.numberFormat)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="contractor-total-row">
              <td colSpan={colCount - 1} style={{ textAlign: 'right' }}>Taxable Amount</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                {formatCurrency(data.totalTaxableAmount, '', options.numberFormat)}
              </td>
            </tr>
            {showGst && !isInterState && (
              <>
                <tr className="contractor-total-row">
                  <td colSpan={colCount - 1} style={{ textAlign: 'right' }}>Output CGST @ {halfRate}%</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(data.totalCgst, '', options.numberFormat)}
                  </td>
                </tr>
                <tr className="contractor-total-row">
                  <td colSpan={colCount - 1} style={{ textAlign: 'right' }}>Output SGST @ {halfRate}%</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(data.totalSgst, '', options.numberFormat)}
                  </td>
                </tr>
              </>
            )}
            {showGst && isInterState && (
              <tr className="contractor-total-row">
                <td colSpan={colCount - 1} style={{ textAlign: 'right' }}>Output IGST @ {primaryRate.toFixed(2)}%</td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(data.totalIgst, '', options.numberFormat)}
                </td>
              </tr>
            )}
            <tr className="contractor-qty-total-row">
              <td colSpan={leftSpan} style={{ textAlign: 'left', fontWeight: 'bold' }}>Total</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatNumber(totalQty, options.numberFormat)}</td>
              <td colSpan={middleSpan} style={{ textAlign: 'center', fontWeight: 'bold' }}>{primaryUnit}</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(data.grandTotal, '', options.numberFormat)}</td>
            </tr>
            {data.roundOff !== 0 && (
              <tr className="contractor-total-row">
                <td colSpan={colCount - 1} style={{ textAlign: 'right' }}>Round Off (+/-)</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(data.roundOff, '', options.numberFormat)}</td>
              </tr>
            )}
            <tr className="contractor-net-total-row">
              <td colSpan={colCount - 1} style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '10.5pt' }}>NET TOTAL (INR)</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '10.5pt' }}>
                {formatCurrency(data.grandTotalRounded, options.currencySymbol, options.numberFormat)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* 6. Amount in Words */}
        {options.showAmountInWords && (
          <div className="contractor-words-box">
            <strong>Amount in Words:</strong> INR {data.amountInWords || amountInWords(data.grandTotalRounded)} Only
          </div>
        )}

        {/* 7. HSN/SAC Tax Schedule */}
        {options.showTaxSummaryTable && showGst && data.taxSummary && data.taxSummary.length > 0 && (
          <>
            <table className="contractor-tax-schedule">
              <thead>
                <tr>
                  <th style={{ width: '15%', textAlign: 'center', whiteSpace: 'nowrap' }}>HSN/SAC</th>
                  <th style={{ width: '22%', textAlign: 'right' }}>Taxable Value ({options.currencySymbol})</th>
                  {!isInterState ? (
                    <>
                      <th style={{ width: '10%', textAlign: 'center', whiteSpace: 'nowrap' }}>CGST Rate</th>
                      <th style={{ width: '14%', textAlign: 'right' }}>CGST Amt ({options.currencySymbol})</th>
                      <th style={{ width: '10%', textAlign: 'center', whiteSpace: 'nowrap' }}>SGST Rate</th>
                      <th style={{ width: '14%', textAlign: 'right' }}>SGST Amt ({options.currencySymbol})</th>
                    </>
                  ) : (
                    <>
                      <th style={{ width: '20%', textAlign: 'center', whiteSpace: 'nowrap' }}>IGST Rate</th>
                      <th style={{ width: '25%', textAlign: 'right' }}>IGST Amt ({options.currencySymbol})</th>
                    </>
                  )}
                  <th style={{ width: '15%', textAlign: 'right' }}>Total Tax ({options.currencySymbol})</th>
                </tr>
              </thead>
              <tbody>
                {data.taxSummary.map((t, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{getHsnForRate(t.gstRate)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(t.taxableAmount, '', options.numberFormat)}</td>
                    {!isInterState ? (
                      <>
                        <td style={{ textAlign: 'center' }}>{(t.gstRate / 2).toFixed(2)}%</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(t.cgst, '', options.numberFormat)}</td>
                        <td style={{ textAlign: 'center' }}>{(t.gstRate / 2).toFixed(2)}%</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(t.sgst, '', options.numberFormat)}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ textAlign: 'center' }}>{t.gstRate.toFixed(2)}%</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(t.igst, '', options.numberFormat)}</td>
                      </>
                    )}
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(t.totalTax, '', options.numberFormat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="contractor-tax-words-box">
              <strong>Tax Amount in Words:</strong> INR {amountInWords(data.totalTax)} Only
            </div>
          </>
        )}

        {/* 8. Declaration & Authorised Signatory Footer */}
        <div className="contractor-footer-grid">
          <div className="contractor-declaration-box">
            <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Declaration:</div>
            <p style={{ margin: 0, fontSize: '7.5pt' }}>
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </p>
            <p style={{ margin: '5px 0 0', fontSize: '7.5pt' }}>
              Please pay this bill via cross &amp; order cheques only payable at Pune.<br />
              Receipt is valid on our official form only signed by Authorised Person.
            </p>
            {options.showNotes && data.notes && (
              <p style={{ margin: '4px 0 0', fontSize: '7.5pt' }}>
                <strong>Note:</strong> {data.notes}
              </p>
            )}
            {options.showTerms && data.terms && (
              <p style={{ margin: '4px 0 0', fontSize: '7pt', color: '#64748b' }}>
                <strong>Terms:</strong> {data.terms}
              </p>
            )}
          </div>

          <div className="contractor-signatory-box">
            <div className="contractor-sign-for">for {data.business.name}</div>
            <div className="contractor-sign-assets">
              {options.showUpiQr && getUpiQrString(data) && (
                <div style={{ marginRight: 'auto', textAlign: 'center' }}>
                  <QRCodeView data={getUpiQrString(data)} size={55} />
                  <div style={{ fontSize: '6.5pt', color: '#64748b' }}>Scan UPI</div>
                </div>
              )}
              {options.showStamp && (data.stampUrl || data.business?.stampUrl) && (
                <img src={data.stampUrl || data.business?.stampUrl} alt="Seal" className="contractor-stamp-img" />
              )}
              {options.showSignature && (data.signatureUrl || data.business?.signatureUrl) && (
                <img src={data.signatureUrl || data.business?.signatureUrl} alt="Signature" className="contractor-signature-img" />
              )}
            </div>
            <div className="contractor-auth-label">Authorised Signatory</div>
          </div>
        </div>

        {/* 9. Thank You & Custom Footer */}
        {(options.showThankYouFooter || options.footerText) && (
          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '7.5pt', color: '#64748b' }}>
            {options.showThankYouFooter && <div>Thank you for your business!</div>}
            {options.footerText && <div style={{ marginTop: '2px', fontStyle: 'italic' }}>{options.footerText}</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`remote-invoice-root ${paperClass} theme-remote-${templateDef?.id || 'dynamic'}`}
      style={themeVars(options)}
    >
      {/* Dynamic Scoped Stylesheet from Netlify */}
      <style>{defaultBaseCss}</style>
      {customCss && <style>{customCss}</style>}

      <Watermark options={options} status={data.status} />

      {/* Header Section */}
      <div className="remote-header">
        <div
          style={{
            display: 'flex',
            flexDirection: options.logoPosition === 'right' ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          {options.showLogo && (data.business?.logoUrl || data.logoUrl) && (
            <img
              src={data.business?.logoUrl || data.logoUrl}
              alt={data.business.name}
              className="remote-logo"
            />
          )}
          <div style={{ textAlign: options.logoPosition === 'center' ? 'center' : 'left' }}>
            <div style={{ fontSize: '13pt', fontWeight: 800 }}>{data.business.name}</div>
            <div style={{ fontSize: '8.5pt', color: '#64748b', maxWidth: '340px' }}>
              {data.business.address}, {data.business.city}, {data.business.state} {data.business.pincode}
            </div>
            <div style={{ fontSize: '8pt', color: '#64748b', marginTop: '2px' }}>
              {data.business.phone && `Ph: ${data.business.phone}`}
              {data.business.email && ` • ${data.business.email}`}
            </div>
            {data.business.gstin && (
              <div style={{ fontSize: '8.5pt', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                GSTIN: {data.business.gstin} {data.business.pan && `• PAN: ${data.business.pan}`}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div className="remote-title">{showGst ? 'TAX INVOICE' : 'INVOICE'}</div>
          {data.copyLabel && (
            <div style={{ fontSize: '8pt', color: '#64748b', fontWeight: 600 }}>{data.copyLabel}</div>
          )}
          <div style={{ marginTop: '6px', fontSize: '9pt' }}>
            <div><strong>Invoice No:</strong> {data.invoiceNumber}</div>
            <div><strong>Date:</strong> {formatDate(data.invoiceDate, options.numberFormat)}</div>
            {data.dueDate && <div><strong>Due Date:</strong> {formatDate(data.dueDate, options.numberFormat)}</div>}
            {data.placeOfSupply && <div><strong>Place of Supply:</strong> {data.placeOfSupply}</div>}
          </div>
        </div>
      </div>

      {/* Parties / Bill To */}
      <div className="remote-meta-grid">
        <div className="remote-party-box">
          <div className="remote-party-title">Billed To (Client / Buyer)</div>
          <div style={{ fontWeight: 700, fontSize: '10.5pt', color: '#0f172a' }}>{data.client.name}</div>
          <div style={{ color: '#475569', marginTop: '2px' }}>
            {data.client.address}, {data.client.city}, {data.client.state} {data.client.pincode}
          </div>
          {data.client.gstin && (
            <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
              GSTIN: {data.client.gstin}
            </div>
          )}
          {data.client.phone && <div>Ph: {data.client.phone}</div>}
        </div>

        <div className="remote-party-box">
          <div className="remote-party-title">Shipping &amp; Supply Details</div>
          <div><strong>State / Code:</strong> {data.placeOfSupply || data.client.state}</div>
          {(data as any).poNumber && <div><strong>Purchase Order (PO):</strong> {(data as any).poNumber}</div>}
          {(data as any).challanNumber && <div><strong>Delivery Challan:</strong> {(data as any).challanNumber}</div>}
          {(data as any).lrNumber && <div><strong>LR / Transporter No:</strong> {(data as any).lrNumber}</div>}
          <div><strong>Payment Terms:</strong> Immediate / Due upon receipt</div>
        </div>
      </div>

      {/* Line Items Table */}
      <table className="remote-table">
        <thead>
          <tr>
            <th style={{ width: '4%' }}>#</th>
            <th style={{ width: '28%' }}>Item &amp; Description</th>
            {options.showHsnSacColumn && <th style={{ width: '10%', textAlign: 'center', whiteSpace: 'nowrap' }}>HSN/SAC</th>}
            <th style={{ width: '8%', textAlign: 'right' }}>Qty</th>
            <th style={{ width: '11%', textAlign: 'right' }}>Rate ({options.currencySymbol})</th>
            {options.showDiscountColumn && <th style={{ width: '7%', textAlign: 'right' }}>Disc%</th>}
            {showGst && <th style={{ width: '11%', textAlign: 'right' }}>Taxable</th>}
            {showGst && <th style={{ width: '7%', textAlign: 'right' }}>GST</th>}
            <th style={{ width: '14%', textAlign: 'right' }}>Total ({options.currencySymbol})</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td>{item.sno || idx + 1}</td>
              <td>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.description}</div>
              </td>
              {options.showHsnSacColumn && (
                <td style={{ textAlign: 'center', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {item.hsnSac || '—'}
                </td>
              )}
              <td style={{ textAlign: 'right' }}>{formatNumber(item.quantity, options.numberFormat)} {item.unit || 'Nos'}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(item.rate, '', options.numberFormat)}</td>
              {options.showDiscountColumn && (
                <td style={{ textAlign: 'right' }}>{item.discount ? `${item.discount}%` : '—'}</td>
              )}
              {showGst && (
                <td style={{ textAlign: 'right' }}>{formatCurrency(item.taxableAmount, '', options.numberFormat)}</td>
              )}
              {showGst && (
                <td style={{ textAlign: 'right' }}>{item.gstRate}%</td>
              )}
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.total, '', options.numberFormat)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tax Breakdown & Totals */}
      <div className="remote-summary-grid">
        <div>
          {/* GST Summary Table */}
          {options.showTaxSummaryTable && showGst && data.taxSummary && data.taxSummary.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
                Tax Rate Breakdown
              </div>
              <table style={{ width: '100%', fontSize: '8pt', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569' }}>
                    <th style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Rate</th>
                    <th style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'right' }}>Taxable</th>
                    {isInterState ? (
                      <th style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'right' }}>IGST</th>
                    ) : (
                      <>
                        <th style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'right' }}>CGST</th>
                        <th style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'right' }}>SGST</th>
                      </>
                    )}
                    <th style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'right' }}>Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {data.taxSummary.map((t, i) => (
                    <tr key={i}>
                      <td style={{ padding: '4px', border: '1px solid #e2e8f0' }}>{t.gstRate}%</td>
                      <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{formatCurrency(t.taxableAmount, '', options.numberFormat)}</td>
                      {isInterState ? (
                        <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{formatCurrency(t.igst, '', options.numberFormat)}</td>
                      ) : (
                        <>
                          <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{formatCurrency(t.cgst, '', options.numberFormat)}</td>
                          <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{formatCurrency(t.sgst, '', options.numberFormat)}</td>
                        </>
                      )}
                      <td style={{ padding: '4px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{formatCurrency(t.totalTax, '', options.numberFormat)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Amount In Words */}
          {options.showAmountInWords && data.amountInWords && (
            <div style={{ fontSize: '8.5pt', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: 700, color: '#475569' }}>Amount in Words: </span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{data.amountInWords}</span>
            </div>
          )}

          {/* Bank & Payment Details */}
          {options.showBankDetails && data.bankDetails && (
            <div style={{ fontSize: '8.5pt', marginTop: '10px', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <div style={{ fontWeight: 700, textTransform: 'uppercase', color: '#475569', fontSize: '7.5pt', marginBottom: '2px' }}>
                Bank Account Remittance
              </div>
              <div><strong>Bank:</strong> {data.bankDetails.bankName} • <strong>A/c:</strong> {data.bankDetails.accountNumber}</div>
              <div><strong>IFSC:</strong> {data.bankDetails.ifsc} • <strong>Branch:</strong> {data.bankDetails.branch}</div>
              {data.bankDetails.upiId && <div><strong>UPI ID:</strong> {data.bankDetails.upiId}</div>}
            </div>
          )}
        </div>

        {/* Totals Column */}
        <div>
          <table className="remote-totals-table">
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(data.subtotal, options.currencySymbol, options.numberFormat)}</td>
              </tr>
              {data.totalDiscount > 0 && (
                <tr style={{ color: '#059669' }}>
                  <td>Discount</td>
                  <td style={{ textAlign: 'right' }}>-{formatCurrency(data.totalDiscount, options.currencySymbol, options.numberFormat)}</td>
                </tr>
              )}
              {showGst && (
                <tr>
                  <td>Total Tax ({isInterState ? 'IGST' : 'CGST+SGST'})</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(data.totalTax, options.currencySymbol, options.numberFormat)}</td>
                </tr>
              )}
              {data.roundOff !== 0 && (
                <tr>
                  <td>Round Off</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(data.roundOff, options.currencySymbol, options.numberFormat)}</td>
                </tr>
              )}
              <tr className="remote-grand-total">
                <td>Grand Total</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(data.grandTotalRounded, options.currencySymbol, options.numberFormat)}</td>
              </tr>
              {data.amountPaid > 0 && (
                <tr style={{ color: '#059669', fontWeight: 600 }}>
                  <td>Amount Paid</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(data.amountPaid, options.currencySymbol, options.numberFormat)}</td>
                </tr>
              )}
              {data.amountPaid > 0 && (
                <tr style={{ fontWeight: 700 }}>
                  <td>Balance Due</td>
                  <td style={{ textAlign: 'right', color: data.balanceDue > 0 ? '#dc2626' : '#059669' }}>
                    {formatCurrency(Math.max(0, data.balanceDue), options.currencySymbol, options.numberFormat)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Stamp, Signature & UPI QR */}
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            {options.showUpiQr && getUpiQrString(data) && (
              <div style={{ textAlign: 'center' }}>
                <QRCodeView data={getUpiQrString(data)} size={isThermal ? 72 : 88} />
                <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '2px' }}>Scan to Pay UPI</div>
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <div className="remote-sign-container">
                {options.showStamp && (data.stampUrl || data.business?.stampUrl) && (
                  <img
                    src={data.stampUrl || data.business?.stampUrl}
                    alt="Company Seal"
                    className="remote-stamp-img"
                  />
                )}
                {options.showSignature && (data.signatureUrl || data.business?.signatureUrl) && (
                  <img
                    src={data.signatureUrl || data.business?.signatureUrl}
                    alt="Signatory"
                    className="remote-signature-img"
                  />
                )}
              </div>
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '4px', fontSize: '8pt', fontWeight: 700, color: '#334155' }}>
                For {data.business.name}
              </div>
              <div style={{ fontSize: '7.5pt', color: '#64748b' }}>Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms Footer */}
      {(options.showNotes && data.notes || options.showTerms && data.terms) && (
        <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '8pt', color: '#64748b' }}>
          {options.showNotes && data.notes && (
            <div style={{ marginBottom: '4px' }}>
              <strong>Notes:</strong> {data.notes}
            </div>
          )}
          {options.showTerms && data.terms && (
            <div>
              <strong>Terms &amp; Conditions:</strong>
              <div style={{ whiteSpace: 'pre-line', marginTop: '2px' }}>{data.terms}</div>
            </div>
          )}
        </div>
      )}

      {/* Thank You & Custom Footer */}
      {(options.showThankYouFooter || options.footerText) && (
        <div style={{ marginTop: '16px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', textAlign: 'center', fontSize: '8pt', color: '#64748b' }}>
          {options.showThankYouFooter && <div>Thank you for your business!</div>}
          {options.footerText && <div style={{ marginTop: '2px', fontStyle: 'italic' }}>{options.footerText}</div>}
        </div>
      )}
    </div>
  );
};

export default DynamicRemoteTheme;
