import React from 'react';
import type { ThemeComponentProps } from '../../types';
import { Watermark } from '../Watermark';
import { themeVars, getUpiQrString } from '../themeHelpers';
import { formatCurrency, formatNumber, formatDate, QRCodeView } from '../../utils';
import styles from './styles.module.css';

export const CorporateTheme: React.FC<ThemeComponentProps> = ({ data, options }) => {
  const paperClass = options.paper === 'A5' ? styles.paperA5 : styles.paperA4;
  const showGst = data.gstType !== 'none';
  const isInterState = data.gstType === 'igst';

  return (
    <div
      className={`${styles.invoiceContainer} ${paperClass}`}
      style={themeVars(options)}
    >
      <Watermark options={options} status={data.status} />

      {/* Top Header */}
      <div className={styles.topHeader}>
        <div className={styles.brandArea}>
          {options.showLogo && (data.business?.logoUrl || data.logoUrl) && (
            <img
              src={data.business?.logoUrl || data.logoUrl}
              alt={data.business.name}
              className={styles.logo}
            />
          )}
          <div>
            <div className={styles.invoiceTitle}>INVOICE</div>
            {data.copyLabel && (
              <div style={{ fontSize: '8pt', textTransform: 'uppercase', color: '#64748b' }}>
                {data.copyLabel}
              </div>
            )}
          </div>
        </div>

        <div className={styles.invoiceMeta}>
          <div><strong>Invoice No:</strong> {data.invoiceNumber}</div>
          <div><strong>Date:</strong> {formatDate(data.invoiceDate, options.numberFormat)}</div>
          {data.dueDate && <div><strong>Due Date:</strong> {formatDate(data.dueDate, options.numberFormat)}</div>}
          {data.placeOfSupply && <div><strong>Place of Supply:</strong> {data.placeOfSupply}</div>}
        </div>
      </div>

      {/* Two-Column Header: FROM / BILL TO */}
      <div className={styles.partiesGrid}>
        <div className={styles.partyCol}>
          <div className={styles.partyLabel}>From</div>
          <div className={styles.partyName}>{data.business.name}</div>
          <div className={styles.partyDetails}>
            <div>{data.business.address}</div>
            <div>{data.business.city}, {data.business.state} - {data.business.pincode}</div>
            <div>Phone: {data.business.phone}</div>
            <div>Email: {data.business.email}</div>
            {data.business.gstin && <div>GSTIN: <strong>{data.business.gstin}</strong></div>}
            {data.business.pan && <div>PAN: <strong>{data.business.pan}</strong></div>}
          </div>
        </div>

        <div className={styles.partyCol}>
          <div className={styles.partyLabel}>Bill To</div>
          <div className={styles.partyName}>{data.client.name}</div>
          <div className={styles.partyDetails}>
            <div>{data.client.address}</div>
            <div>{data.client.city}, {data.client.state} - {data.client.pincode}</div>
            {data.client.phone && <div>Phone: {data.client.phone}</div>}
            {data.client.email && <div>Email: {data.client.email}</div>}
            {data.client.gstin && <div>GSTIN: <strong>{data.client.gstin}</strong></div>}
          </div>
        </div>
      </div>

      {/* Corporate Table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: '32px' }} className={styles.centerCol}>#</th>
            <th>Item & Description</th>
            {options.showHsnSacColumn && <th style={{ width: '75px', whiteSpace: 'nowrap' }} className={styles.centerCol}>HSN/SAC</th>}
            <th style={{ width: '50px' }} className={styles.numCol}>Qty</th>
            <th style={{ width: '70px' }} className={styles.numCol}>Rate</th>
            {options.showDiscountColumn && <th style={{ width: '55px' }} className={styles.numCol}>Disc</th>}
            {showGst && <th style={{ width: '50px' }} className={styles.numCol}>Tax%</th>}
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

      {/* Totals Section */}
      <div className={styles.totalsSection}>
        <table className={styles.totalsTable}>
          <tbody>
            <tr>
              <td style={{ color: '#64748b' }}>Sub Total</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                {formatCurrency(data.subtotal, options.currencySymbol, options.numberFormat)}
              </td>
            </tr>
            {data.totalDiscount > 0 && (
              <>
                <tr>
                  <td style={{ color: '#64748b' }}>Total Discount</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>
                    -{formatCurrency(data.totalDiscount, options.currencySymbol, options.numberFormat)}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b' }}>Taxable Subtotal</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(data.totalTaxableAmount, options.currencySymbol, options.numberFormat)}
                  </td>
                </tr>
              </>
            )}
            {showGst && !isInterState && (
              <>
                <tr>
                  <td style={{ color: '#64748b' }}>CGST</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(data.totalCgst, options.currencySymbol, options.numberFormat)}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b' }}>SGST</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(data.totalSgst, options.currencySymbol, options.numberFormat)}
                  </td>
                </tr>
              </>
            )}
            {showGst && isInterState && (
              <tr>
                <td style={{ color: '#64748b' }}>IGST</td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(data.totalIgst, options.currencySymbol, options.numberFormat)}
                </td>
              </tr>
            )}
            {data.roundOff !== 0 && (
              <tr>
                <td style={{ color: '#64748b' }}>Round off</td>
                <td style={{ textAlign: 'right' }}>
                  {data.roundOff > 0 ? '+' : ''}{formatNumber(data.roundOff, options.numberFormat)}
                </td>
              </tr>
            )}
            <tr className={styles.grandTotalRow}>
              <td>Grand Total</td>
              <td style={{ textAlign: 'right' }}>
                {formatCurrency(data.grandTotalRounded, options.currencySymbol, options.numberFormat)}
              </td>
            </tr>
            {data.amountPaid > 0 && (
              <>
                <tr>
                  <td style={{ color: '#64748b' }}>Amount Paid</td>
                  <td style={{ textAlign: 'right', color: '#059669' }}>
                    {formatCurrency(data.amountPaid, options.currencySymbol, options.numberFormat)}
                  </td>
                </tr>
                <tr style={{ fontWeight: 700 }}>
                  <td>Balance Due</td>
                  <td style={{ textAlign: 'right', color: data.balanceDue > 0 ? '#dc2626' : '#0f172a' }}>
                    {formatCurrency(data.balanceDue, options.currencySymbol, options.numberFormat)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {options.showAmountInWords && data.amountInWords && (
        <div className={styles.words}>
          <strong>Amount Chargeable (in words):</strong> {data.amountInWords}
        </div>
      )}

      {/* Tax Summary Table */}
      {options.showTaxSummaryTable && showGst && data.taxSummary && data.taxSummary.length > 0 && (
        <table className={styles.taxTable}>
          <thead>
            <tr>
              <th>GST Rate</th>
              <th>Taxable Value</th>
              {!isInterState && <th>CGST Amount</th>}
              {!isInterState && <th>SGST Amount</th>}
              {isInterState && <th>IGST Amount</th>}
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

      {/* Bottom Section */}
      <div className={styles.bottomSection}>
        {/* Left: Bank details & UPI */}
        <div>
          {options.showBankDetails && data.bankDetails && (
            <div className={styles.bankBox}>
              <div style={{ fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                Bank Account &amp; Remittance
              </div>
              <div>Account Name: {data.bankDetails.accountName}</div>
              <div>Bank: {data.bankDetails.bankName} | A/c No: {data.bankDetails.accountNumber}</div>
              <div>IFSC Code: {data.bankDetails.ifsc} {data.bankDetails.branch ? `| Branch: ${data.bankDetails.branch}` : ''}</div>
              {data.bankDetails.upiId && <div>UPI ID: {data.bankDetails.upiId}</div>}
            </div>
          )}

          {options.showUpiQr && getUpiQrString(data) && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <QRCodeView
                data={getUpiQrString(data)}
                size={60}
              />
              <div style={{ fontSize: '7.5pt', color: '#64748b' }}>
                <div><strong>Scan to remit payment</strong></div>
                <div>Scan with any UPI app</div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Signature and Company Stamp side by side */}
        <div className={styles.signStampGrid}>
          <div className={styles.stampBox}>
            {options.showStamp && (data.stampUrl || data.business?.stampUrl) ? (
              <img
                src={data.stampUrl || data.business?.stampUrl}
                alt="Company Stamp"
                className={styles.signatureImg}
                style={{ maxHeight: '42px', maxWidth: '75px', objectFit: 'contain' }}
              />
            ) : null}
            <div>Company Stamp</div>
          </div>
          <div className={styles.signBox}>
            {options.showSignature && (data.signatureUrl || data.business?.signatureUrl) && (
              <img
                src={data.signatureUrl || data.business?.signatureUrl}
                alt="Signature"
                className={styles.signatureImg}
              />
            )}
            <div>Authorized Signatory</div>
          </div>
        </div>
      </div>

      {/* Formal Terms Section */}
      {options.showTerms && data.terms && (
        <div className={styles.formalTerms}>
          <div style={{ fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
            Standard Terms of Business
          </div>
          <div>{data.terms}</div>
          {options.showNotes && data.notes && (
            <div style={{ marginTop: 4 }}>Note: {data.notes}</div>
          )}
        </div>
      )}

      {(options.showThankYouFooter || options.footerText) && (
        <div className={styles.footer}>
          {options.showThankYouFooter && <div>This is a computer-generated invoice.</div>}
          {options.footerText && <div style={{ marginTop: 2 }}>{options.footerText}</div>}
        </div>
      )}
    </div>
  );
};

export default CorporateTheme;
