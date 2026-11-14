import React from 'react';
import type { ThemeComponentProps } from '../../types';
import { Watermark } from '../Watermark';
import {
  themeVars,
  getUpiQrString,
  isUSInvoice,
  getInvoiceTitle,
  getCodeColumnHeader,
  getTaxColumnHeader,
  getCurrencySymbol,
  getNumberFormat,
} from '../themeHelpers';
import { formatCurrency, formatNumber, formatDate, QRCodeView } from '../../utils';
import styles from './styles.module.css';

export const ModernTheme: React.FC<ThemeComponentProps> = ({ data, options }) => {
  const paperClass = options.paper === 'A5' ? styles.paperA5 : styles.paperA4;
  const isUS = isUSInvoice(data);
  const showGst = data.gstType !== 'none';
  const isInterState = data.gstType === 'igst';
  const hasItemDates = data.items.some((i) => Boolean(i.date));
  const showDateCol = data.invoiceType === 'monthly' || hasItemDates;

  const invoiceTitle = getInvoiceTitle(data);
  const codeHeader = getCodeColumnHeader(data);
  const taxHeader = getTaxColumnHeader(data);
  const curSymbol = getCurrencySymbol(data, options);
  const numFormat = getNumberFormat(data, options);
  const hasTaxOnItems = (data.totalSalesTax ?? 0) > 0 || data.items.some((i) => (Number(i.gstRate) || 0) > 0);

  return (
    <div
      className={`${styles.invoiceContainer} ${paperClass}`}
      style={themeVars(options)}
    >
      <Watermark options={options} status={data.status} />

      {/* Top Accent Band with Title and Logo */}
      <div className={styles.accentBand}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          {options.showLogo && (data.business?.logoUrl || data.logoUrl) && (
            <img
              src={data.business?.logoUrl || data.logoUrl}
              alt={data.business.name}
              className={styles.logo}
              style={{ maxHeight: '44px', maxWidth: '130px', objectFit: 'contain', flexShrink: 0 }}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <div className={styles.bandTitle}>{invoiceTitle}</div>
            {data.copyLabel && (
              <span className={styles.copyBadge}>{data.copyLabel}</span>
            )}
          </div>
        </div>
        <div className={styles.metaBlock}>
          <div className={styles.bandMeta}>#{data.invoiceNumber}</div>
          {data.billingPeriod && (
            <div className={styles.bandMeta}>Period: {data.billingPeriod}</div>
          )}
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
              {isUS ? (
                <>
                  {data.business.ein && <div>EIN: <strong>{data.business.ein}</strong></div>}
                  {data.business.stateTaxId && <div>State Tax ID: <strong>{data.business.stateTaxId}</strong></div>}
                </>
              ) : (
                <>
                  {data.business.gstin && <div>GSTIN: <strong>{data.business.gstin}</strong></div>}
                  {data.business.pan && <div>PAN: <strong>{data.business.pan}</strong></div>}
                </>
              )}
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
              {isUS ? (
                <>
                  {data.client.ein && <div>EIN / Tax ID: <strong>{data.client.ein}</strong></div>}
                  {data.client.taxExempt && <div style={{ color: '#059669', fontWeight: 600 }}>Tax-Exempt Customer</div>}
                </>
              ) : (
                data.client.gstin && <div>GSTIN: <strong>{data.client.gstin}</strong></div>
              )}
              {data.dueDate && <div>Due Date: {formatDate(data.dueDate, options.numberFormat)}</div>}
            </div>
          </div>
        </div>

        {/* Zebra Table */}
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '32px' }} className={styles.centerCol}>#</th>
              {showDateCol && <th style={{ width: '80px', whiteSpace: 'nowrap' }} className={styles.centerCol}>Date</th>}
              <th>Description</th>
              {options.showHsnSacColumn && <th style={{ width: '75px', whiteSpace: 'nowrap' }} className={styles.centerCol}>{codeHeader}</th>}
              <th style={{ width: '50px' }} className={styles.numCol}>Qty</th>
              <th style={{ width: '70px' }} className={styles.numCol}>Rate</th>
              {options.showDiscountColumn && <th style={{ width: '55px' }} className={styles.numCol}>Disc</th>}
              {(showGst || (isUS && hasTaxOnItems)) && <th style={{ width: '50px' }} className={styles.numCol}>{taxHeader}</th>}
              <th style={{ width: '85px' }} className={styles.numCol}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td className={styles.centerCol}>{item.sno || idx + 1}</td>
                {showDateCol && (
                  <td className={styles.centerCol} style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontSize: '8pt' }}>
                    {item.date ? formatDate(item.date, options.numberFormat) : '—'}
                  </td>
                )}
                <td>
                  <span className={styles.itemTitle}>{item.description}</span>
                </td>
                {options.showHsnSacColumn && (
                  <td className={styles.centerCol} style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {item.sku || item.hsnSac || '—'}
                  </td>
                )}
                <td className={styles.numCol}>{item.quantity} {item.unit || ''}</td>
                <td className={styles.numCol}>{formatNumber(item.rate, options.numberFormat)}</td>
                {options.showDiscountColumn && (
                  <td className={styles.numCol}>{item.discount ? `${item.discount}%` : '—'}</td>
                )}
                {(showGst || (isUS && hasTaxOnItems)) && (
                  <td className={styles.numCol}>{item.taxable === false ? 'Exempt' : `${item.gstRate}%`}</td>
                )}
                <td className={styles.numCol}>{formatNumber(item.total, numFormat)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className={styles.totalsCard}>
          <div className={styles.totalsRow}>
            <span>Subtotal</span>
            <span style={{ fontWeight: 600 }}>
              {formatCurrency(data.subtotal, curSymbol, numFormat)}
            </span>
          </div>
          {data.totalDiscount > 0 && (
            <>
              <div className={styles.totalsRow}>
                <span>Discount</span>
                <span style={{ color: '#dc2626' }}>
                  -{formatCurrency(data.totalDiscount, curSymbol, numFormat)}
                </span>
              </div>
              <div className={styles.totalsRow}>
                <span>Taxable Subtotal</span>
                <span>{formatCurrency(data.totalTaxableAmount, curSymbol, numFormat)}</span>
              </div>
            </>
          )}
          {isUS ? (
            (data.totalSalesTax ?? 0) > 0 && (
              <div className={styles.totalsRow}>
                <span>Sales Tax</span>
                <span>{formatCurrency(data.totalSalesTax ?? 0, curSymbol, numFormat)}</span>
              </div>
            )
          ) : (
            <>
              {showGst && !isInterState && (
                <>
                  <div className={styles.totalsRow}>
                    <span>CGST</span>
                    <span>{formatCurrency(data.totalCgst, curSymbol, numFormat)}</span>
                  </div>
                  <div className={styles.totalsRow}>
                    <span>SGST</span>
                    <span>{formatCurrency(data.totalSgst, curSymbol, numFormat)}</span>
                  </div>
                </>
              )}
              {showGst && isInterState && (
                <div className={styles.totalsRow}>
                  <span>IGST</span>
                  <span>{formatCurrency(data.totalIgst, curSymbol, numFormat)}</span>
                </div>
              )}
            </>
          )}
          {data.roundOff !== 0 && (
            <div className={styles.totalsRow}>
              <span>Round off</span>
              <span>{data.roundOff > 0 ? '+' : ''}{formatNumber(data.roundOff, numFormat)}</span>
            </div>
          )}
          <div className={styles.grandTotalRow}>
            <span>Grand Total</span>
            <span>{formatCurrency(data.grandTotalRounded, curSymbol, numFormat)}</span>
          </div>
          {data.amountPaid > 0 && (
            <>
              <div className={styles.totalsRow} style={{ marginTop: 8 }}>
                <span>Paid</span>
                <span style={{ color: '#059669' }}>
                  {formatCurrency(data.amountPaid, curSymbol, numFormat)}
                </span>
              </div>
              <div className={styles.totalsRow} style={{ fontWeight: 700 }}>
                <span>Balance Due</span>
                <span style={{ color: data.balanceDue > 0 ? '#dc2626' : '#111827' }}>
                  {formatCurrency(data.balanceDue, curSymbol, numFormat)}
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
        {options.showTaxSummaryTable && ((showGst && !isUS) || (isUS && (data.totalSalesTax ?? 0) > 0)) && data.taxSummary && data.taxSummary.length > 0 && (
          <table className={styles.taxTable}>
            <thead>
              <tr>
                <th>{isUS ? 'Tax Rate' : 'GST Rate'}</th>
                <th>Taxable Val</th>
                {!isUS && !isInterState && <th>CGST</th>}
                {!isUS && !isInterState && <th>SGST</th>}
                {!isUS && isInterState && <th>IGST</th>}
                <th>{isUS ? 'Sales Tax' : 'Total Tax'}</th>
              </tr>
            </thead>
            <tbody>
              {data.taxSummary.map((row, i) => (
                <tr key={i}>
                  <td>{row.label || `${row.gstRate}%`}</td>
                  <td>{formatNumber(row.taxableAmount, numFormat)}</td>
                  {!isUS && !isInterState && <td>{formatNumber(row.cgst, numFormat)}</td>}
                  {!isUS && !isInterState && <td>{formatNumber(row.sgst, numFormat)}</td>}
                  {!isUS && isInterState && <td>{formatNumber(row.igst, numFormat)}</td>}
                  <td>{formatNumber(row.totalTax, numFormat)}</td>
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
                  {isUS ? 'Payment & Remittance Details' : 'Bank & Payment Details'}
                </div>
                <div>{data.bankDetails.bankName} | A/c: {data.bankDetails.accountNumber}</div>
                {isUS ? (
                  <>
                    {(data.bankDetails.routingNumber || data.bankDetails.ifsc) && (
                      <div>Routing (ABA): <strong>{data.bankDetails.routingNumber || data.bankDetails.ifsc}</strong></div>
                    )}
                    {data.bankDetails.zelleId && <div>Zelle: <strong>{data.bankDetails.zelleId}</strong></div>}
                    {data.bankDetails.paymentLink && <div>Payment Link: <strong>{data.bankDetails.paymentLink}</strong></div>}
                  </>
                ) : (
                  <>
                    <div>IFSC: {data.bankDetails.ifsc} | Branch: {data.bankDetails.branch || '—'}</div>
                    {data.bankDetails.upiId && <div>UPI ID: <strong>{data.bankDetails.upiId}</strong></div>}
                  </>
                )}
              </div>
            )}

            {!isUS && options.showUpiQr && getUpiQrString(data) && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <QRCodeView
                  data={getUpiQrString(data)}
                  size={65}
                />
                <div style={{ fontSize: '7.5pt', color: '#64748b' }}>
                  <strong>Scan QR to Pay</strong>
                  <div>Instant UPI transfer</div>
                </div>
              </div>
            )}
          </div>

          {/* Signature & Stamp */}
          <div className={styles.signWrapper}>
            <div>
              {((data.stampUrl || data.business?.stampUrl) || (options.showSignature && (data.signatureUrl || data.business?.signatureUrl))) ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', minHeight: '40px' }}>
                  {(data.stampUrl || data.business?.stampUrl) && (
                    <img
                      src={data.stampUrl || data.business?.stampUrl}
                      alt="Company Stamp"
                      style={{ maxHeight: '42px', maxWidth: '75px', objectFit: 'contain' }}
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
              <div className={styles.signLabel}>Authorized Signatory</div>
            </div>
          </div>
        </div>

        {options.showNotes && data.notes && (
          <div className={styles.termsNotes}>
            <strong>Note:</strong> {data.notes}
          </div>
        )}

        {options.showTerms && data.terms && (
          <div className={styles.termsNotes}>
            <strong>Terms & Conditions:</strong>
            <div>{data.terms}</div>
          </div>
        )}

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
