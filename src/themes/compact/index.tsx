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

export const CompactTheme: React.FC<ThemeComponentProps> = ({ data, options }) => {
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

      {/* Header Band */}
      <div className={styles.headerBand}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {options.showLogo && (data.business?.logoUrl || data.logoUrl) && (
            <img
              src={data.business?.logoUrl || data.logoUrl}
              alt={data.business?.name || ''}
              className={styles.logo}
              style={{ maxHeight: '32px', maxWidth: '100px', objectFit: 'contain' }}
            />
          )}
          <div>
            <div className={styles.companyTitle}>{data.business?.name || ''}</div>
            <div className={styles.companySub}>
              {data.business?.address}, {data.business?.city} - {data.business?.pincode} | Tel: {data.business?.phone}
              {isUS ? (
                <>
                  {data.business?.ein && ` | EIN: ${data.business.ein}`}
                  {data.business?.stateTaxId && ` | State Tax ID: ${data.business.stateTaxId}`}
                </>
              ) : (
                data.business?.gstin && ` | GSTIN: ${data.business.gstin}`
              )}
            </div>
          </div>
        </div>

        <div className={styles.invoiceBadge}>
          <div className={styles.invoiceTitle}>{invoiceTitle}</div>
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
          {data.billingPeriod && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Period:</span>
              <span className={styles.metaVal}>{data.billingPeriod}</span>
            </div>
          )}
          {data.dueDate && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Due Date:</span>
              <span className={styles.metaVal}>{formatDate(data.dueDate, options.numberFormat)}</span>
            </div>
          )}
          {data.placeOfSupply && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>{isUS ? 'State / Jurisdiction:' : 'Place of Supply:'}</span>
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
            Bill To: {data.client?.name || ''}
          </div>
          <div style={{ fontSize: '7.5pt', color: '#4b5563' }}>
            {data.client?.address}, {data.client?.city} - {data.client?.pincode}
            {isUS ? (
              <>
                {data.client?.ein && ` | EIN: ${data.client.ein}`}
                {data.client?.taxExempt && ' | Tax-Exempt Entity'}
              </>
            ) : (
              data.client?.gstin && ` | GSTIN: ${data.client.gstin}`
            )}
          </div>
        </div>
      </div>

      {/* High density line items table */}
      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th style={{ width: '22px' }} className={styles.centerCol}>#</th>
            {showDateCol && <th style={{ width: '70px', whiteSpace: 'nowrap' }} className={styles.centerCol}>Date</th>}
            <th>Item Description</th>
            {options.showHsnSacColumn && <th style={{ width: '65px', whiteSpace: 'nowrap' }} className={styles.centerCol}>{codeHeader}</th>}
            <th style={{ width: '40px' }} className={styles.numCol}>Qty</th>
            <th style={{ width: '60px' }} className={styles.numCol}>Rate</th>
            {options.showDiscountColumn && <th style={{ width: '45px' }} className={styles.numCol}>Disc</th>}
            {(showGst || (isUS && hasTaxOnItems)) && <th style={{ width: '40px' }} className={styles.numCol}>{taxHeader}</th>}
            <th style={{ width: '75px' }} className={styles.numCol}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {(data.items || []).map((item, idx) => (
            <tr key={item.id || idx}>
              <td className={styles.centerCol}>{item.sno || idx + 1}</td>
              {showDateCol && (
                <td className={styles.centerCol} style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontSize: '7.5pt' }}>
                  {item.date ? formatDate(item.date, options.numberFormat) : '—'}
                </td>
              )}
              <td>
                <span className={styles.itemDesc}>{item.description}</span>
              </td>
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

      {/* Footer Info & Totals Combined */}
      <div className={styles.bottomSection}>
        <div className={styles.bottomLeft}>
          {options.showBankDetails && data.bankDetails && (
            <div className={styles.compactBank}>
              <strong>{isUS ? 'Remittance:' : 'Bank Details:'}</strong> {data.bankDetails.bankName} | A/c: {data.bankDetails.accountNumber}
              {isUS ? (
                <>
                  {(data.bankDetails.routingNumber || data.bankDetails.ifsc) && (
                    <span> | Routing: {data.bankDetails.routingNumber || data.bankDetails.ifsc}</span>
                  )}
                  {data.bankDetails.zelleId && <span> | Zelle: {data.bankDetails.zelleId}</span>}
                  {data.bankDetails.paymentLink && <span> | Link: {data.bankDetails.paymentLink}</span>}
                </>
              ) : (
                <>
                  <span> | IFSC: {data.bankDetails.ifsc}</span>
                  {data.bankDetails.upiId && <span> | UPI: {data.bankDetails.upiId}</span>}
                </>
              )}
            </div>
          )}

          {!isUS && options.showUpiQr && getUpiQrString(data) && (
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <QRCodeView
                data={getUpiQrString(data)}
                size={45}
              />
              <span style={{ fontSize: '7pt', color: '#6b7280' }}>Scan to Pay via UPI</span>
            </div>
          )}

          {options.showNotes && data.notes && (
            <div style={{ fontSize: '7pt', color: '#4b5563', marginTop: 4 }}>
              <strong>Note:</strong> {data.notes}
            </div>
          )}
          {options.showTerms && data.terms && (
            <div style={{ fontSize: '7pt', color: '#6b7280', marginTop: 2 }}>
              <strong>Terms:</strong> {data.terms}
            </div>
          )}
        </div>

        <div className={styles.bottomRight}>
          <table className={styles.compactTotals}>
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(data.subtotal, curSymbol, numFormat)}
                </td>
              </tr>
              {data.totalDiscount > 0 && (
                <>
                  <tr>
                    <td>Discount</td>
                    <td style={{ textAlign: 'right', color: '#dc2626' }}>
                      -{formatCurrency(data.totalDiscount, curSymbol, numFormat)}
                    </td>
                  </tr>
                  <tr>
                    <td>Taxable Subtotal</td>
                    <td style={{ textAlign: 'right' }}>
                      {formatCurrency(data.totalTaxableAmount, curSymbol, numFormat)}
                    </td>
                  </tr>
                </>
              )}
              {isUS ? (
                (data.totalSalesTax ?? 0) > 0 && (
                  <tr>
                    <td>Sales Tax</td>
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
                        <td>CGST</td>
                        <td style={{ textAlign: 'right' }}>
                          {formatCurrency(data.totalCgst, curSymbol, numFormat)}
                        </td>
                      </tr>
                      <tr>
                        <td>SGST</td>
                        <td style={{ textAlign: 'right' }}>
                          {formatCurrency(data.totalSgst, curSymbol, numFormat)}
                        </td>
                      </tr>
                    </>
                  )}
                  {showGst && isInterState && (
                    <tr>
                      <td>IGST</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(data.totalIgst, curSymbol, numFormat)}
                      </td>
                    </tr>
                  )}
                </>
              )}
              {data.roundOff !== 0 && (
                <tr>
                  <td>Round Off</td>
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
                    <td>Paid</td>
                    <td style={{ textAlign: 'right', color: '#059669' }}>
                      {formatCurrency(data.amountPaid, curSymbol, numFormat)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 700 }}>
                    <td>Due</td>
                    <td style={{ textAlign: 'right', color: data.balanceDue > 0 ? '#dc2626' : '#111827' }}>
                      {formatCurrency(data.balanceDue, curSymbol, numFormat)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          {options.showAmountInWords && data.amountInWords && (
            <div className={styles.compactWords}>
              {data.amountInWords}
            </div>
          )}

          {/* Signature / Stamp */}
          <div className={styles.signArea}>
            {((options.showStamp && (data.stampUrl || data.business?.stampUrl)) || (options.showSignature && (data.signatureUrl || data.business?.signatureUrl))) ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', minHeight: '36px', marginBottom: '2px' }}>
                {options.showStamp && (data.stampUrl || data.business?.stampUrl) && (
                  <img
                    src={data.stampUrl || data.business?.stampUrl}
                    alt="Company Stamp"
                    style={{ maxHeight: '36px', maxWidth: '60px', objectFit: 'contain' }}
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
