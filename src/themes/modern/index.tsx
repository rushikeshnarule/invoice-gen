import React from 'react';
import type { ThemeComponentProps } from '../../types';
import { Watermark } from '../Watermark';
import { themeVars, getUpiQrString } from '../themeHelpers';
import { formatCurrency, formatNumber, formatDate, QRCodeView } from '../../utils';
import styles from './styles.module.css';

export const ModernTheme: React.FC<ThemeComponentProps> = ({ data, options }) => {
  const paperClass = options.paper === 'A5' ? styles.paperA5 : styles.paperA4;
  const showGst = data.gstType !== 'none';
  const isInterState = data.gstType === 'igst';

  return (
    <div
      className={`${styles.invoiceContainer} ${paperClass}`}
      style={themeVars(options)}
    >
      <Watermark options={options} status={data.status} />

      {/* Coloured Top Band */}
      <div className={styles.topBand}>
        <div className={styles.bandLeft}>
          {options.showLogo && (data.business?.logoUrl || data.logoUrl) && (
            <img
              src={data.business?.logoUrl || data.logoUrl}
              alt={data.business.name}
              className={styles.bandLogo}
            />
          )}
          <div>
            <div className={styles.bandCompany}>{data.business.name}</div>
            <div className={styles.bandMeta}>
              {data.business.city}, {data.business.state} | {data.business.phone}
            </div>
          </div>
        </div>

        <div className={styles.bandRight}>
          <div className={styles.bandTitle}>INVOICE</div>
          <div className={styles.bandMeta}>#{data.invoiceNumber}</div>
          <div className={styles.bandMeta}>
            Date: {formatDate(data.invoiceDate, options.numberFormat)}
          </div>
        </div>
      </div>

      <div className={styles.contentArea}>
        {/* Two Column Parties Block */}
        <div className={styles.partiesGrid}>
          {/* Business details */}
          <div className={styles.partyCard}>
            <div className={styles.partyHeader}>Billed From</div>
            <div className={styles.partyName}>{data.business.name}</div>
            <div className={styles.partyDetails}>
              <div>{data.business.address}</div>
              <div>{data.business.city}, {data.business.state} - {data.business.pincode}</div>
              <div>Email: {data.business.email}</div>
              {data.business.gstin && <div>GSTIN: <strong>{data.business.gstin}</strong></div>}
              {data.business.pan && <div>PAN: <strong>{data.business.pan}</strong></div>}
            </div>
          </div>

          {/* Client details */}
          <div className={styles.partyCard}>
            <div className={styles.partyHeader}>Billed To</div>
            <div className={styles.partyName}>{data.client.name}</div>
            <div className={styles.partyDetails}>
              <div>{data.client.address}</div>
              <div>{data.client.city}, {data.client.state} - {data.client.pincode}</div>
              {data.client.phone && <div>Phone: {data.client.phone}</div>}
              {data.client.email && <div>Email: {data.client.email}</div>}
              {data.client.gstin && <div>GSTIN: <strong>{data.client.gstin}</strong></div>}
              {data.dueDate && <div>Due Date: {formatDate(data.dueDate, options.numberFormat)}</div>}
            </div>
          </div>
        </div>

        {/* Zebra Table */}
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '32px' }} className={styles.centerCol}>#</th>
              <th>Description</th>
              {options.showHsnSacColumn && <th style={{ width: '75px', whiteSpace: 'nowrap' }} className={styles.centerCol}>HSN/SAC</th>}
              <th style={{ width: '50px' }} className={styles.numCol}>Qty</th>
              <th style={{ width: '70px' }} className={styles.numCol}>Rate</th>
              {options.showDiscountColumn && <th style={{ width: '55px' }} className={styles.numCol}>Disc</th>}
              {showGst && <th style={{ width: '50px' }} className={styles.numCol}>Tax</th>}
              <th style={{ width: '85px' }} className={styles.numCol}>Total</th>
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

        {/* Rounded Totals Card */}
        <div className={styles.totalsCard}>
          <div className={styles.totalsRow}>
            <span>Subtotal</span>
            <span style={{ fontWeight: 600 }}>
              {formatCurrency(data.subtotal, options.currencySymbol, options.numberFormat)}
            </span>
          </div>
          {data.totalDiscount > 0 && (
            <>
              <div className={styles.totalsRow}>
                <span>Discount</span>
                <span style={{ color: '#dc2626' }}>
                  -{formatCurrency(data.totalDiscount, options.currencySymbol, options.numberFormat)}
                </span>
              </div>
              <div className={styles.totalsRow}>
                <span>Taxable Subtotal</span>
                <span>{formatCurrency(data.totalTaxableAmount, options.currencySymbol, options.numberFormat)}</span>
              </div>
            </>
          )}
          {showGst && !isInterState && (
            <>
              <div className={styles.totalsRow}>
                <span>CGST</span>
                <span>{formatCurrency(data.totalCgst, options.currencySymbol, options.numberFormat)}</span>
              </div>
              <div className={styles.totalsRow}>
                <span>SGST</span>
                <span>{formatCurrency(data.totalSgst, options.currencySymbol, options.numberFormat)}</span>
              </div>
            </>
          )}
          {showGst && isInterState && (
            <div className={styles.totalsRow}>
              <span>IGST</span>
              <span>{formatCurrency(data.totalIgst, options.currencySymbol, options.numberFormat)}</span>
            </div>
          )}
          {data.roundOff !== 0 && (
            <div className={styles.totalsRow}>
              <span>Round off</span>
              <span>{data.roundOff > 0 ? '+' : ''}{formatNumber(data.roundOff, options.numberFormat)}</span>
            </div>
          )}
          <div className={styles.grandTotalRow}>
            <span>Grand Total</span>
            <span>{formatCurrency(data.grandTotalRounded, options.currencySymbol, options.numberFormat)}</span>
          </div>
          {data.amountPaid > 0 && (
            <>
              <div className={styles.totalsRow} style={{ marginTop: 8 }}>
                <span>Paid</span>
                <span style={{ color: '#059669' }}>
                  {formatCurrency(data.amountPaid, options.currencySymbol, options.numberFormat)}
                </span>
              </div>
              <div className={styles.totalsRow} style={{ fontWeight: 700 }}>
                <span>Balance Due</span>
                <span style={{ color: data.balanceDue > 0 ? '#dc2626' : '#111827' }}>
                  {formatCurrency(data.balanceDue, options.currencySymbol, options.numberFormat)}
                </span>
              </div>
            </>
          )}
        </div>

        {options.showAmountInWords && data.amountInWords && (
          <div className={styles.words}>
            <strong>Amount in Words:</strong> {data.amountInWords}
          </div>
        )}

        {/* Tax Summary Table */}
        {options.showTaxSummaryTable && showGst && data.taxSummary && data.taxSummary.length > 0 && (
          <table className={styles.taxTable}>
            <thead>
              <tr>
                <th>GST Rate</th>
                <th>Taxable Val</th>
                {!isInterState && <th>CGST</th>}
                {!isInterState && <th>SGST</th>}
                {isInterState && <th>IGST</th>}
                <th>Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {data.taxSummary.map((row, i) => (
                <tr key={i}>
                  <td>{row.gstRate}%</td>
                  <td>{formatNumber(row.taxableAmount, options.numberFormat)}</td>
                  {!isInterState && <td>{formatNumber(row.cgst, options.numberFormat)}</td>}
                  {!isInterState && <td>{formatNumber(row.sgst, options.numberFormat)}</td>}
                  {isInterState && <td>{formatNumber(row.igst, options.numberFormat)}</td>}
                  <td>{formatNumber(row.totalTax, options.numberFormat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Bottom Details */}
        <div className={styles.bottomGrid}>
          <div>
            {options.showBankDetails && data.bankDetails && (
              <div className={styles.bankBox}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
                  Bank & Payment Details
                </div>
                <div>{data.bankDetails.bankName} | A/c: {data.bankDetails.accountNumber}</div>
                <div>IFSC: {data.bankDetails.ifsc} | Branch: {data.bankDetails.branch || '—'}</div>
                {data.bankDetails.upiId && <div>UPI ID: <strong>{data.bankDetails.upiId}</strong></div>}
              </div>
            )}

            {options.showUpiQr && getUpiQrString(data) && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <QRCodeView
                  data={getUpiQrString(data)}
                  size={65}
                />
                <div style={{ fontSize: '7.5pt', color: '#64748b' }}>
                  <strong>Scan QR to Pay</strong>
                  <div>Scan with any UPI app</div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.signBox}>
            {((options.showStamp && (data.stampUrl || data.business?.stampUrl)) || (options.showSignature && (data.signatureUrl || data.business?.signatureUrl))) ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', minHeight: '44px', margin: '4px 0' }}>
                {options.showStamp && (data.stampUrl || data.business?.stampUrl) && (
                  <img
                    src={data.stampUrl || data.business?.stampUrl}
                    alt="Company Stamp"
                    style={{ maxHeight: '44px', maxWidth: '75px', objectFit: 'contain' }}
                  />
                )}
                {options.showSignature && (data.signatureUrl || data.business?.signatureUrl) && (
                  <img
                    src={data.signatureUrl || data.business?.signatureUrl}
                    alt="Signature"
                    className={styles.signatureImg}
                    style={{ margin: 0 }}
                  />
                )}
              </div>
            ) : null}
            <div className={styles.signLine} style={(data.signatureUrl || data.business?.signatureUrl || data.stampUrl || data.business?.stampUrl) ? { marginTop: '6px' } : undefined}>
              Authorized Signatory
            </div>
            <div style={{ fontSize: '7.5pt', color: '#94a3b8', marginTop: 2 }}>{data.business.name}</div>
          </div>
        </div>

        {/* Notes & Terms */}
        {options.showNotes && data.notes && (
          <div style={{ fontSize: '8pt', color: '#64748b', marginTop: 14 }}>
            <strong>Note:</strong> {data.notes}
          </div>
        )}
        {options.showTerms && data.terms && (
          <div style={{ fontSize: '7.5pt', color: '#94a3b8', marginTop: 6, whiteSpace: 'pre-line' }}>
            {data.terms}
          </div>
        )}

        {/* Footer */}
        {(options.showThankYouFooter || options.footerText) && (
          <div className={styles.footer}>
            {options.showThankYouFooter && <div>Thank you for choosing {data.business.name}!</div>}
            {options.footerText && <div style={{ marginTop: 2 }}>{options.footerText}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernTheme;
