import React from 'react';
import type { ThemeComponentProps } from '../../types';
import { Watermark } from '../Watermark';
import { themeVars, getUpiQrString } from '../themeHelpers';
import { formatCurrency, formatNumber, formatDate, QRCodeView } from '../../utils';
import styles from './styles.module.css';

export const MinimalTheme: React.FC<ThemeComponentProps> = ({ data, options }) => {
  const paperClass = options.paper === 'A5' ? styles.paperA5 : styles.paperA4;
  const showGst = data.gstType !== 'none';
  const isInterState = data.gstType === 'igst';

  return (
    <div
      className={`${styles.invoiceContainer} ${paperClass}`}
      style={themeVars(options)}
    >
      <Watermark options={options} status={data.status} />

      {/* Header Grid */}
      <div className={styles.headerGrid}>
        <div>
          {options.showLogo && (data.business?.logoUrl || data.logoUrl) && (
            <div>
              <img
                src={data.business?.logoUrl || data.logoUrl}
                alt={data.business.name}
                className={styles.logo}
              />
            </div>
          )}
          <div className={styles.businessName}>{data.business.name}</div>
          <div className={styles.businessMeta}>
            <div>{data.business.address}, {data.business.city}</div>
            <div>{data.business.state} - {data.business.pincode}</div>
            <div>{data.business.email} | {data.business.phone}</div>
            {data.business.gstin && <div>GSTIN: {data.business.gstin}</div>}
          </div>
        </div>

        <div className={styles.titleBlock}>
          <div className={styles.invoiceTitle}>INVOICE</div>
          <div className={styles.invoiceNum}>{data.invoiceNumber}</div>
          <div className={styles.dateRow}>
            Date: {formatDate(data.invoiceDate, options.numberFormat)}
          </div>
          {data.dueDate && (
            <div className={styles.dateRow}>
              Due: {formatDate(data.dueDate, options.numberFormat)}
            </div>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* Bill To & Details */}
      <div className={styles.twoCol}>
        <div className={styles.billToBlock}>
          <div className={styles.billToLabel}>Billed To</div>
          <div className={styles.clientName}>{data.client.name}</div>
          <div className={styles.clientDetails}>
            <div>{data.client.address}</div>
            <div>{data.client.city}, {data.client.state} - {data.client.pincode}</div>
            {data.client.phone && <div>{data.client.phone}</div>}
            {data.client.gstin && <div>GSTIN: {data.client.gstin}</div>}
          </div>
        </div>

        {data.placeOfSupply && (
          <div className={styles.invoiceMetaBlock}>
            <div className={styles.metaItem}>
              <div className={styles.metaItemLabel}>Place of Supply</div>
              <div className={styles.metaItemValue}>{data.placeOfSupply}</div>
            </div>
            {data.copyLabel && (
              <div className={styles.metaItem} style={{ marginTop: 6 }}>
                <div className={styles.metaItemLabel}>Copy</div>
                <div className={styles.metaItemValue}>{data.copyLabel}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: '28px' }} className={styles.centerCol}>#</th>
            <th>Description</th>
            {options.showHsnSacColumn && <th style={{ width: '75px', whiteSpace: 'nowrap' }} className={styles.centerCol}>HSN</th>}
            <th style={{ width: '45px' }} className={styles.numCol}>Qty</th>
            <th style={{ width: '65px' }} className={styles.numCol}>Rate</th>
            {options.showDiscountColumn && <th style={{ width: '50px' }} className={styles.numCol}>Disc</th>}
            {showGst && <th style={{ width: '45px' }} className={styles.numCol}>Tax</th>}
            <th style={{ width: '80px' }} className={styles.numCol}>Total</th>
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

      {/* Totals */}
      <div className={styles.totalsSection}>
        <table className={styles.totalsTable}>
          <tbody>
            <tr>
              <td style={{ color: '#6b7280' }}>Subtotal</td>
              <td style={{ textAlign: 'right' }}>
                {formatCurrency(data.subtotal, options.currencySymbol, options.numberFormat)}
              </td>
            </tr>
            {data.totalDiscount > 0 && (
              <>
                <tr>
                  <td style={{ color: '#6b7280' }}>Discount</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>
                    -{formatCurrency(data.totalDiscount, options.currencySymbol, options.numberFormat)}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#6b7280' }}>Taxable Subtotal</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(data.totalTaxableAmount, options.currencySymbol, options.numberFormat)}
                  </td>
                </tr>
              </>
            )}
            {showGst && !isInterState && (
              <>
                <tr>
                  <td style={{ color: '#6b7280' }}>CGST</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(data.totalCgst, options.currencySymbol, options.numberFormat)}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#6b7280' }}>SGST</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(data.totalSgst, options.currencySymbol, options.numberFormat)}
                  </td>
                </tr>
              </>
            )}
            {showGst && isInterState && (
              <tr>
                <td style={{ color: '#6b7280' }}>IGST</td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(data.totalIgst, options.currencySymbol, options.numberFormat)}
                </td>
              </tr>
            )}
            {data.roundOff !== 0 && (
              <tr>
                <td style={{ color: '#6b7280' }}>Round off</td>
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
                  <td style={{ color: '#6b7280' }}>Paid</td>
                  <td style={{ textAlign: 'right', color: '#059669' }}>
                    {formatCurrency(data.amountPaid, options.currencySymbol, options.numberFormat)}
                  </td>
                </tr>
                <tr style={{ fontWeight: 600 }}>
                  <td>Balance</td>
                  <td style={{ textAlign: 'right' }}>
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
          Amount in words: {data.amountInWords}
        </div>
      )}

      {/* Tax Summary Table */}
      {options.showTaxSummaryTable && showGst && data.taxSummary && data.taxSummary.length > 0 && (
        <table className={styles.taxTable}>
          <thead>
            <tr>
              <th>Rate</th>
              <th>Taxable</th>
              {!isInterState && <th>CGST</th>}
              {!isInterState && <th>SGST</th>}
              {isInterState && <th>IGST</th>}
              <th>Tax Amount</th>
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

      {/* Footer Grid */}
      <div className={styles.footerGrid}>
        <div>
          {options.showBankDetails && data.bankDetails && (
            <div className={styles.bankBox}>
              <div style={{ textTransform: 'uppercase', fontSize: '7pt', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 2 }}>
                Payment Information
              </div>
              <div><strong>{data.bankDetails.bankName}</strong></div>
              <div>A/c: {data.bankDetails.accountNumber} | IFSC: {data.bankDetails.ifsc}</div>
              {data.bankDetails.upiId && <div>UPI: {data.bankDetails.upiId}</div>}
            </div>
          )}

          {options.showUpiQr && getUpiQrString(data) && (
            <div style={{ marginTop: 10 }}>
              <QRCodeView
                data={getUpiQrString(data)}
                size={60}
              />
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
          <div style={{ borderTop: '0.5px solid #d1d5db', paddingTop: 4, width: '150px', marginLeft: 'auto' }}>
            Authorized Signatory
          </div>
        </div>
      </div>

      {(options.showNotes && data.notes) || (options.showTerms && data.terms) ? (
        <div className={styles.notesTerms}>
          {options.showNotes && data.notes && <div>{data.notes}</div>}
          {options.showTerms && data.terms && <div style={{ marginTop: 4 }}>{data.terms}</div>}
        </div>
      ) : null}

      {(options.showThankYouFooter || options.footerText) && (
        <div className={styles.thankYou}>
          {options.showThankYouFooter && <div>Thank you</div>}
          {options.footerText && <div style={{ marginTop: 2 }}>{options.footerText}</div>}
        </div>
      )}
    </div>
  );
};

export default MinimalTheme;
