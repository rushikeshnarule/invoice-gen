import React from 'react';
import type { ThemeComponentProps } from '../../types';
import { Watermark } from '../Watermark';
import { themeVars, getUpiQrString } from '../themeHelpers';
import { formatCurrency, formatNumber, formatDate, QRCodeView } from '../../utils';
import styles from './styles.module.css';

export const CompactTheme: React.FC<ThemeComponentProps> = ({ data, options }) => {
  const paperClass = options.paper === 'A5' ? styles.paperA5 : styles.paperA4;
  const showGst = data.gstType !== 'none';
  const isInterState = data.gstType === 'igst';

  return (
    <div
      className={`${styles.invoiceContainer} ${paperClass}`}
      style={themeVars(options)}
    >
      <Watermark options={options} status={data.status} />

      {/* Header Row */}
      <div className={styles.headerRow}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {options.showLogo && (data.business?.logoUrl || data.logoUrl) && (
            <img
              src={data.business?.logoUrl || data.logoUrl}
              alt={data.business.name}
              className={styles.logo}
            />
          )}
          <div>
            <div className={styles.companyTitle}>{data.business.name}</div>
            <div className={styles.companySub}>
              {data.business.address}, {data.business.city} - {data.business.pincode} | Tel: {data.business.phone}
              {data.business.gstin && ` | GSTIN: ${data.business.gstin}`}
            </div>
          </div>
        </div>

        <div className={styles.invoiceBadge}>
          <div className={styles.invoiceTitle}>{showGst ? 'TAX INVOICE' : 'INVOICE'}</div>
          <div style={{ fontSize: '8pt', fontWeight: 600 }}>#{data.invoiceNumber}</div>
        </div>
      </div>

      {/* Two-Column Meta Block */}
      <div className={styles.metaBlock}>
        <div className={styles.metaColLeft}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Date:</span>
            <span className={styles.metaVal}>{formatDate(data.invoiceDate, options.numberFormat)}</span>
          </div>
          {data.dueDate && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Due Date:</span>
              <span className={styles.metaVal}>{formatDate(data.dueDate, options.numberFormat)}</span>
            </div>
          )}
          {data.placeOfSupply && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Place of Supply:</span>
              <span className={styles.metaVal}>{data.placeOfSupply}</span>
            </div>
          )}
          {data.copyLabel && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Copy:</span>
              <span className={styles.metaVal}>{data.copyLabel}</span>
            </div>
          )}
        </div>

        <div className={styles.metaColRight}>
          <div style={{ fontWeight: 700, color: '#111827' }}>
            Bill To: {data.client.name}
          </div>
          <div style={{ fontSize: '7.5pt', color: '#4b5563' }}>
            {data.client.address}, {data.client.city} - {data.client.pincode}
            {data.client.gstin && ` | GSTIN: ${data.client.gstin}`}
          </div>
        </div>
      </div>

      {/* High density line items table */}
      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th style={{ width: '22px' }} className={styles.centerCol}>#</th>
            <th>Item Description</th>
            {options.showHsnSacColumn && <th style={{ width: '65px', whiteSpace: 'nowrap' }} className={styles.centerCol}>HSN</th>}
            <th style={{ width: '40px' }} className={styles.numCol}>Qty</th>
            <th style={{ width: '60px' }} className={styles.numCol}>Rate</th>
            {options.showDiscountColumn && <th style={{ width: '45px' }} className={styles.numCol}>Disc</th>}
            {showGst && <th style={{ width: '40px' }} className={styles.numCol}>GST</th>}
            <th style={{ width: '75px' }} className={styles.numCol}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td className={styles.centerCol}>{item.sno || idx + 1}</td>
              <td>
                <span className={styles.itemDesc}>{item.description}</span>
              </td>
              {options.showHsnSacColumn && (
                <td className={styles.centerCol} style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {item.hsnSac || '—'}
                </td>
              )}
              <td className={styles.numCol}>{item.quantity} {item.unit || ''}</td>
              <td className={styles.numCol}>{formatNumber(item.rate, options.numberFormat)}</td>
              {options.showDiscountColumn && (
                <td className={styles.numCol}>{item.discount ? `${item.discount}%` : '—'}</td>
              )}
              {showGst && (
                <td className={styles.numCol}>{item.gstRate}%</td>
              )}
              <td className={styles.numCol}>{formatNumber(item.total, options.numberFormat)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Split Bottom Section */}
      <div className={styles.bottomSplit}>
        <div className={styles.detailsCol}>
          {options.showAmountInWords && data.amountInWords && (
            <div style={{ marginBottom: 4 }}>
              <strong>In Words:</strong> {data.amountInWords}
            </div>
          )}

          {options.showBankDetails && data.bankDetails && (
            <div className={styles.bankBox}>
              <strong>Bank Details:</strong> {data.bankDetails.bankName} | A/c: {data.bankDetails.accountNumber} | IFSC: {data.bankDetails.ifsc}
              {data.bankDetails.upiId && <span> | UPI: {data.bankDetails.upiId}</span>}
            </div>
          )}

          {options.showUpiQr && getUpiQrString(data) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <QRCodeView
                data={getUpiQrString(data)}
                size={50}
              />
              <span style={{ fontSize: '7pt', color: '#6b7280' }}>Scan to Pay via UPI</span>
            </div>
          )}

          {options.showNotes && data.notes && (
            <div style={{ fontSize: '7pt', color: '#4b5563', marginBottom: 2 }}>
              <strong>Note:</strong> {data.notes}
            </div>
          )}
          {options.showTerms && data.terms && (
            <div style={{ fontSize: '7pt', color: '#6b7280', whiteSpace: 'pre-line' }}>
              <strong>Terms:</strong> {data.terms}
            </div>
          )}
        </div>

        {/* Right Col: Totals + Sign */}
        <div>
          <table className={styles.totalsTable}>
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(data.subtotal, options.currencySymbol, options.numberFormat)}
                </td>
              </tr>
              {data.totalDiscount > 0 && (
                <>
                  <tr>
                    <td>Discount</td>
                    <td style={{ textAlign: 'right', color: '#dc2626' }}>
                      -{formatCurrency(data.totalDiscount, options.currencySymbol, options.numberFormat)}
                    </td>
                  </tr>
                  <tr>
                    <td>Taxable Subtotal</td>
                    <td style={{ textAlign: 'right' }}>
                      {formatCurrency(data.totalTaxableAmount, options.currencySymbol, options.numberFormat)}
                    </td>
                  </tr>
                </>
              )}
              {showGst && !isInterState && (
                <>
                  <tr>
                    <td>CGST</td>
                    <td style={{ textAlign: 'right' }}>
                      {formatCurrency(data.totalCgst, options.currencySymbol, options.numberFormat)}
                    </td>
                  </tr>
                  <tr>
                    <td>SGST</td>
                    <td style={{ textAlign: 'right' }}>
                      {formatCurrency(data.totalSgst, options.currencySymbol, options.numberFormat)}
                    </td>
                  </tr>
                </>
              )}
              {showGst && isInterState && (
                <tr>
                  <td>IGST</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(data.totalIgst, options.currencySymbol, options.numberFormat)}
                  </td>
                </tr>
              )}
              {data.roundOff !== 0 && (
                <tr>
                  <td>Round off</td>
                  <td style={{ textAlign: 'right' }}>
                    {data.roundOff > 0 ? '+' : ''}{formatNumber(data.roundOff, options.numberFormat)}
                  </td>
                </tr>
              )}
              <tr className={styles.grandTotalRow}>
                <td>Total</td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(data.grandTotalRounded, options.currencySymbol, options.numberFormat)}
                </td>
              </tr>
              {data.amountPaid > 0 && (
                <>
                  <tr>
                    <td>Paid</td>
                    <td style={{ textAlign: 'right', color: '#059669' }}>
                      {formatCurrency(data.amountPaid, options.currencySymbol, options.numberFormat)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 700 }}>
                    <td>Balance</td>
                    <td style={{ textAlign: 'right' }}>
                      {formatCurrency(data.balanceDue, options.currencySymbol, options.numberFormat)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          {options.showSignature && (
            <div style={{ marginTop: 8 }}>
              {((options.showStamp && (data.stampUrl || data.business?.stampUrl)) || (data.signatureUrl || data.business?.signatureUrl)) ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '30px', margin: '2px 0' }}>
                  {options.showStamp && (data.stampUrl || data.business?.stampUrl) && (
                    <img
                      src={data.stampUrl || data.business?.stampUrl}
                      alt="Company Stamp"
                      style={{ maxHeight: '30px', maxWidth: '60px', objectFit: 'contain' }}
                    />
                  )}
                  {(data.signatureUrl || data.business?.signatureUrl) && (
                    <img
                      src={data.signatureUrl || data.business?.signatureUrl}
                      alt="Signature"
                      style={{ maxHeight: '30px', maxWidth: '70px', objectFit: 'contain' }}
                    />
                  )}
                </div>
              ) : null}
              <div className={styles.signLine}>
                For {data.business.name} (Auth. Signatory)
              </div>
            </div>
          )}
        </div>
      </div>

      {(options.showThankYouFooter || options.footerText) && (
        <div className={styles.footer}>
          {options.showThankYouFooter && <span>Thank you for your business! </span>}
          {options.footerText && <span>{options.footerText}</span>}
        </div>
      )}
    </div>
  );
};

export default CompactTheme;
