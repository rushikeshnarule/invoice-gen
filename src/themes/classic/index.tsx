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

export const ClassicTheme: React.FC<ThemeComponentProps> = ({ data, options }) => {
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

      {/* Top Bar with Title & Copy Badge */}
      <div className={styles.topBar}>
        <div className={styles.invoiceTitle}>{invoiceTitle}</div>
        {data.copyLabel && (
          <div className={styles.copyBadge}>{data.copyLabel}</div>
        )}
      </div>

      {/* Centred Business Header */}
      <div className={styles.headerSection}>
        {options.showLogo && (data.business?.logoUrl || data.logoUrl) && (
          <div
            style={{
              display: 'flex',
              justifyContent: options.logoPosition === 'left' ? 'flex-start' : options.logoPosition === 'right' ? 'flex-end' : 'center',
              width: '100%',
              marginBottom: 4,
            }}
          >
            <img
              src={data.business?.logoUrl || data.logoUrl}
              alt={data.business.name}
              className={styles.logo}
              style={{ maxHeight: '55px', maxWidth: '180px', objectFit: 'contain' }}
            />
          </div>
        )}
        <div className={styles.companyName}>{data.business.name}</div>
        <div className={styles.companyAddress}>
          {data.business.address}, {data.business.city}, {data.business.state} - {data.business.pincode}
        </div>
        <div className={styles.companyContact}>
          Phone: {data.business.phone} | Email: {data.business.email}
          {data.business.website && ` | Web: ${data.business.website}`}
        </div>

        {/* Tax Identifiers */}
        <div className={styles.gstBoxes}>
          {isUS ? (
            <>
              {data.business.ein && (
                <div className={styles.gstBox}>
                  EIN: <strong>{data.business.ein}</strong>
                </div>
              )}
              {data.business.stateTaxId && (
                <div className={styles.gstBox}>
                  State Tax ID: <strong>{data.business.stateTaxId}</strong>
                </div>
              )}
            </>
          ) : (
            <>
              {data.business.gstin && (
                <div className={styles.gstBox}>
                  GSTIN: <strong>{data.business.gstin}</strong>
                </div>
              )}
              {data.business.pan && (
                <div className={styles.gstBox}>
                  PAN: <strong>{data.business.pan}</strong>
                </div>
              )}
              {data.placeOfSupply && (
                <div className={styles.gstBox}>
                  State Code: <strong>{data.placeOfSupply}</strong>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Two Column Metadata Box */}
      <div className={styles.metaGrid}>
        {/* Left Column: Invoice Details */}
        <div className={styles.metaColLeft}>
          <div className={styles.sectionHeading}>Invoice Details</div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Invoice No:</span>
            <span className={styles.metaVal}>{data.invoiceNumber}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Invoice Date:</span>
            <span className={styles.metaVal}>{formatDate(data.invoiceDate, options.numberFormat)}</span>
          </div>
          {data.billingPeriod && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Billing Period:</span>
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
        </div>

        {/* Right Column: Billed To Details */}
        <div className={styles.metaColRight}>
          <div className={styles.sectionHeading}>Billed To (Buyer)</div>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{data.client.name}</div>
          <div style={{ fontSize: '8.5pt', color: '#4b5563', marginBottom: 2 }}>
            {data.client.address}, {data.client.city}, {data.client.state} - {data.client.pincode}
          </div>
          {data.client.phone && (
            <div style={{ fontSize: '8.5pt' }}>Phone: {data.client.phone}</div>
          )}
          {isUS ? (
            <>
              {data.client.ein && (
                <div style={{ fontSize: '8.5pt', marginTop: 2 }}>
                  EIN / Tax ID: <strong>{data.client.ein}</strong>
                </div>
              )}
              {data.client.taxExempt && (
                <div style={{ fontSize: '8pt', color: '#059669', fontWeight: 600, marginTop: 2 }}>
                  Tax-Exempt Customer
                </div>
              )}
            </>
          ) : (
            data.client.gstin && (
              <div style={{ fontSize: '8.5pt', marginTop: 2 }}>
                GSTIN: <strong>{data.client.gstin}</strong>
              </div>
            )
          )}
        </div>
      </div>

      {/* Line Items Table with full borders */}
      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th style={{ width: '32px' }} className={styles.centerCol}>#</th>
            {showDateCol && <th style={{ width: '80px', whiteSpace: 'nowrap' }} className={styles.centerCol}>Date</th>}
            <th>Item Description</th>
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
                <div className={styles.itemDesc}>{item.description}</div>
              </td>
              {options.showHsnSacColumn && (
                <td className={styles.centerCol} style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {item.sku || item.hsnSac || '—'}
                </td>
              )}
              <td className={styles.numCol}>
                {item.quantity} {item.unit || ''}
              </td>
              <td className={styles.numCol}>
                {formatNumber(item.rate, options.numberFormat)}
              </td>
              {options.showDiscountColumn && (
                <td className={styles.numCol}>
                  {item.discount ? `${item.discount}%` : '—'}
                </td>
              )}
              {(showGst || (isUS && hasTaxOnItems)) && (
                <td className={styles.numCol}>
                  {item.taxable === false ? 'Exempt' : `${item.gstRate}%`}
                </td>
              )}
              <td className={styles.numCol}>
                {formatNumber(item.total, numFormat)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Summary */}
      <div className={styles.summaryRow}>
        <table className={styles.totalsTable}>
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
              <td>Grand Total</td>
              <td style={{ textAlign: 'right', color: 'var(--accent, #111827)' }}>
                {formatCurrency(data.grandTotalRounded, curSymbol, numFormat)}
              </td>
            </tr>
            {data.amountPaid > 0 && (
              <>
                <tr>
                  <td>Amount Paid</td>
                  <td style={{ textAlign: 'right', color: '#059669' }}>
                    {formatCurrency(data.amountPaid, curSymbol, numFormat)}
                  </td>
                </tr>
                <tr style={{ fontWeight: 700 }}>
                  <td>Balance Due</td>
                  <td style={{ textAlign: 'right', color: data.balanceDue > 0 ? '#dc2626' : '#111827' }}>
                    {formatCurrency(data.balanceDue, curSymbol, numFormat)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Amount in words */}
      {options.showAmountInWords && data.amountInWords && (
        <div className={styles.amountInWordsBox}>
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

      {/* Bank Details & Signature Section */}
      <div className={styles.bottomSection}>
        {/* Left: Bank Details & Remittance */}
        <div className={styles.bankBlock}>
          {options.showBankDetails && data.bankDetails && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '8.5pt', marginBottom: 4, textTransform: 'uppercase' }}>
                {isUS ? 'Payment & Remittance' : 'Bank Account Details'}
              </div>
              <div style={{ fontSize: '8pt', lineHeight: 1.5 }}>
                {data.bankDetails.bankName && <div><strong>Bank:</strong> {data.bankDetails.bankName}</div>}
                <div><strong>A/c Name:</strong> {data.bankDetails.accountName}</div>
                <div><strong>A/c No:</strong> {data.bankDetails.accountNumber}</div>
                {isUS ? (
                  <>
                    {(data.bankDetails.routingNumber || data.bankDetails.ifsc) && (
                      <div><strong>Routing (ABA):</strong> {data.bankDetails.routingNumber || data.bankDetails.ifsc}</div>
                    )}
                    {data.bankDetails.zelleId && (
                      <div><strong>Zelle:</strong> {data.bankDetails.zelleId}</div>
                    )}
                    {data.bankDetails.paymentLink && (
                      <div><strong>Payment Link:</strong> {data.bankDetails.paymentLink}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div><strong>IFSC:</strong> {data.bankDetails.ifsc}</div>
                    {data.bankDetails.branch && <div><strong>Branch:</strong> {data.bankDetails.branch}</div>}
                  </>
                )}
              </div>
            </div>
          )}

          {!isUS && options.showUpiQr && getUpiQrString(data) && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <QRCodeView
                data={getUpiQrString(data)}
                size={70}
              />
              <div style={{ fontSize: '7.5pt', color: '#4b5563' }}>
                <strong>Scan & Pay via UPI</strong>
                {data.bankDetails?.upiId && <div>{data.bankDetails.upiId}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Right: Signature & Stamp */}
        <div className={styles.signBlock}>
          <div style={{ fontSize: '8.5pt', fontWeight: 600 }}>
            For {data.business.name}
          </div>
          <div>
            {((data.stampUrl || data.business?.stampUrl) || (options.showSignature && (data.signatureUrl || data.business?.signatureUrl))) ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', minHeight: '44px', margin: '4px 0' }}>
                {(data.stampUrl || data.business?.stampUrl) && (
                  <img
                    src={data.stampUrl || data.business?.stampUrl}
                    alt="Company Stamp"
                    style={{ maxHeight: '48px', maxWidth: '80px', objectFit: 'contain' }}
                  />
                )}
                {options.showSignature && (data.signatureUrl || data.business?.signatureUrl) && (
                  <img
                    src={data.signatureUrl || data.business?.signatureUrl}
                    alt="Signature"
                    className={styles.signatureImage}
                    style={{ margin: 0 }}
                  />
                )}
              </div>
            ) : null}
            <div className={styles.signLine} style={(data.signatureUrl || data.business?.signatureUrl || data.stampUrl || data.business?.stampUrl) ? { marginTop: '8px' } : undefined}>
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {options.showNotes && data.notes && (
        <div className={styles.notesTerms}>
          <strong>Notes:</strong> {data.notes}
        </div>
      )}
      {options.showTerms && data.terms && (
        <div className={styles.notesTerms}>
          <strong>Terms & Conditions:</strong>
          <div>{data.terms}</div>
        </div>
      )}

      {/* Footer */}
      {(options.showThankYouFooter || options.footerText) && (
        <div className={styles.footer}>
          {options.showThankYouFooter && <div>Thank you for your business!</div>}
          {options.footerText && <div style={{ marginTop: 2 }}>{options.footerText}</div>}
        </div>
      )}
    </div>
  );
};

export default ClassicTheme;
