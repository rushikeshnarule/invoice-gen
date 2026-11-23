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

export const MinimalTheme: React.FC<ThemeComponentProps> = ({ data, options }) => {
  const paperClass = options.paper === 'A5' ? styles.paperA5 : styles.paperA4;
  const isUS = isUSInvoice(data);
  const showGst = data.gstType !== 'none';
  const isInterState = data.gstType === 'igst';
  const hasItemDates = (data.items || []).some((i) => Boolean(i.date));
  const showDateCol = data.invoiceType === 'monthly' || hasItemDates;

  const invoiceTitle = getInvoiceTitle(data);
  const codeHeader = getCodeColumnHeader(data);
  const taxHeader = getTaxColumnHeader(data);
  const curSymbol = getCurrencySymbol(data, options);
  const numFormat = getNumberFormat(data, options);
  const hasTaxOnItems = (data.totalSalesTax ?? 0) > 0 || (data.items || []).some((i) => (Number(i.gstRate) || 0) > 0);

  return (
    <div
      className={`${styles.invoiceContainer} ${paperClass}`}
      style={themeVars(options)}
    >
      <Watermark options={options} status={data.status} />

      {/* Header */}
      <div className={styles.header}>
        <div>
          {options.showLogo && (data.business?.logoUrl || data.logoUrl) && (
            <div style={{ marginBottom: 6 }}>
              <img
                src={data.business?.logoUrl || data.logoUrl}
                alt={data.business?.name || ''}
                className={styles.logo}
                style={{ maxHeight: '48px', maxWidth: '160px', objectFit: 'contain' }}
              />
            </div>
          )}
          <div className={styles.businessName}>{data.business?.name || ''}</div>
          <div className={styles.businessMeta}>
            <div>{data.business?.address}, {data.business?.city}</div>
            <div>{data.business?.state} - {data.business?.pincode}</div>
            <div>{data.business?.email} | {data.business?.phone}</div>
            {isUS ? (
              <>
                {data.business?.ein && <div>EIN: <strong>{data.business?.ein}</strong></div>}
                {data.business?.stateTaxId && <div>State Tax ID: <strong>{data.business?.stateTaxId}</strong></div>}
              </>
            ) : (
              <>
                {data.business?.gstin && <div>GSTIN: {data.business?.gstin}</div>}
                {data.business?.pan && <div>PAN: {data.business?.pan}</div>}
              </>
            )}
          </div>
        </div>

        <div className={styles.titleBlock}>
          <div className={styles.invoiceTitle}>{invoiceTitle}</div>
          <div className={styles.invoiceNum}>{data.invoiceNumber}</div>
          <div className={styles.dateRow}>
            Date: {formatDate(data.invoiceDate, options.numberFormat)}
          </div>
          {data.billingPeriod && (
            <div className={styles.dateRow}>Period: {data.billingPeriod}</div>
          )}
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
            {isUS ? (
              <>
                {data.client.ein && <div>EIN / Tax ID: <strong>{data.client.ein}</strong></div>}
                {data.client.taxExempt && <div style={{ color: '#059669', fontWeight: 600 }}>Tax-Exempt Entity</div>}
              </>
            ) : (
              data.client.gstin && <div>GSTIN: {data.client.gstin}</div>
            )}
          </div>
        </div>

        {data.placeOfSupply && (
          <div className={styles.invoiceMetaBlock}>
            <div className={styles.metaItem}>
              <div className={styles.metaItemLabel}>{isUS ? 'State / Jurisdiction' : 'Place of Supply'}</div>
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
            {showDateCol && <th style={{ width: '80px', whiteSpace: 'nowrap' }} className={styles.centerCol}>Date</th>}
            <th>Description</th>
            {options.showHsnSacColumn && <th style={{ width: '75px', whiteSpace: 'nowrap' }} className={styles.centerCol}>{codeHeader}</th>}
            <th style={{ width: '45px' }} className={styles.numCol}>Qty</th>
            <th style={{ width: '65px' }} className={styles.numCol}>Rate</th>
            {options.showDiscountColumn && <th style={{ width: '50px' }} className={styles.numCol}>Disc</th>}
            {(showGst || (isUS && hasTaxOnItems)) && <th style={{ width: '45px' }} className={styles.numCol}>{taxHeader}</th>}
            <th style={{ width: '80px' }} className={styles.numCol}>Total</th>
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
              <td>{item.description}</td>
              {options.showHsnSacColumn && (
                <td className={styles.centerCol} style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {item.sku || item.hsnSac || '—'}
                </td>
              )}
              <td className={styles.numCol}>{item.quantity} {item.unit || ''}</td>
              <td className={styles.numCol}>{formatNumber(item.rate, numFormat)}</td>
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

      {/* Totals */}
      <div className={styles.totalsBlock}>
        <table className={styles.totalsTable}>
          <tbody>
            <tr>
              <td style={{ color: '#6b7280' }}>Subtotal</td>
              <td style={{ textAlign: 'right', fontWeight: 500 }}>
                {formatCurrency(data.subtotal, curSymbol, numFormat)}
              </td>
            </tr>
            {data.totalDiscount > 0 && (
              <>
                <tr>
                  <td style={{ color: '#6b7280' }}>Discount</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>
                    -{formatCurrency(data.totalDiscount, curSymbol, numFormat)}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#6b7280' }}>Taxable Subtotal</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(data.totalTaxableAmount, curSymbol, numFormat)}
                  </td>
                </tr>
              </>
            )}
            {isUS ? (
              (data.totalSalesTax ?? 0) > 0 && (
                <tr>
                  <td style={{ color: '#6b7280' }}>Sales Tax</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(data.totalSalesTax ?? 0, curSymbol, numFormat)}
                  </td>
                </tr>
              )
            ) : (
              <>
                {showGst && !isInterState && (
                  <>
                    <tr>
                      <td style={{ color: '#6b7280' }}>CGST</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(data.totalCgst, curSymbol, numFormat)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: '#6b7280' }}>SGST</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(data.totalSgst, curSymbol, numFormat)}
                      </td>
                    </tr>
                  </>
                )}
                {showGst && isInterState && (
                  <tr>
                    <td style={{ color: '#6b7280' }}>IGST</td>
                    <td style={{ textAlign: 'right' }}>
                      {formatCurrency(data.totalIgst, curSymbol, numFormat)}
                    </td>
                  </tr>
                )}
              </>
            )}
            {data.roundOff !== 0 && (
              <tr>
                <td style={{ color: '#6b7280' }}>Round off</td>
                <td style={{ textAlign: 'right' }}>
                  {data.roundOff > 0 ? '+' : ''}{formatNumber(data.roundOff, numFormat)}
                </td>
              </tr>
            )}
            <tr className={styles.grandTotalRow}>
              <td>Total</td>
              <td style={{ textAlign: 'right' }}>
                {formatCurrency(data.grandTotalRounded, curSymbol, numFormat)}
              </td>
            </tr>
            {data.amountPaid > 0 && (
              <>
                <tr>
                  <td style={{ color: '#6b7280' }}>Paid</td>
                  <td style={{ textAlign: 'right', color: '#059669' }}>
                    {formatCurrency(data.amountPaid, curSymbol, numFormat)}
                  </td>
                </tr>
                <tr style={{ fontWeight: 600 }}>
                  <td>Balance</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(data.balanceDue, curSymbol, numFormat)}
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
      {options.showTaxSummaryTable && ((showGst && !isUS) || (isUS && (data.totalSalesTax ?? 0) > 0)) && data.taxSummary && data.taxSummary.length > 0 && (
        <table className={styles.taxTable}>
          <thead>
            <tr>
              <th>{isUS ? 'Rate' : 'Rate'}</th>
              <th>Taxable</th>
              {!isUS && !isInterState && <th>CGST</th>}
              {!isUS && !isInterState && <th>SGST</th>}
              {!isUS && isInterState && <th>IGST</th>}
              <th>{isUS ? 'Sales Tax' : 'Tax Amount'}</th>
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

      {/* Footer Grid */}
      <div className={styles.footerGrid}>
        <div>
          {options.showBankDetails && data.bankDetails && (
            <div className={styles.bankBox}>
              <div style={{ textTransform: 'uppercase', fontSize: '7pt', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 2 }}>
                Payment Information
              </div>
              <div><strong>{data.bankDetails.bankName}</strong></div>
              <div>A/c: {data.bankDetails.accountNumber}</div>
              {isUS ? (
                <>
                  {(data.bankDetails.routingNumber || data.bankDetails.ifsc) && (
                    <div>Routing (ABA): <strong>{data.bankDetails.routingNumber || data.bankDetails.ifsc}</strong></div>
                  )}
                  {data.bankDetails.zelleId && <div>Zelle: {data.bankDetails.zelleId}</div>}
                  {data.bankDetails.paymentLink && <div>Payment Link: {data.bankDetails.paymentLink}</div>}
                </>
              ) : (
                <>
                  <div>IFSC: {data.bankDetails.ifsc}</div>
                  {data.bankDetails.upiId && <div>UPI: {data.bankDetails.upiId}</div>}
                </>
              )}
            </div>
          )}

          {!isUS && options.showUpiQr && getUpiQrString(data) && (
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
          <div className={styles.signLine}>Authorized Signatory</div>
        </div>
      </div>

      {/* Notes and Terms */}
      {options.showNotes && data.notes && (
        <div className={styles.notesBlock}>Note: {data.notes}</div>
      )}
      {options.showTerms && data.terms && (
        <div className={styles.notesBlock}>Terms: {data.terms}</div>
      )}

      {(options.showThankYouFooter || options.footerText) && (
        <div className={styles.footer}>
          {options.showThankYouFooter && <div>Thank you for your business.</div>}
          {options.footerText && <div style={{ marginTop: 2 }}>{options.footerText}</div>}
        </div>
      )}
    </div>
  );
};

export default MinimalTheme;
