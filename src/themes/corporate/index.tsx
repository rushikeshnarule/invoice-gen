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

export const CorporateTheme: React.FC<ThemeComponentProps> = ({ data, options }) => {
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

      {/* Header Bar */}
      <div className={styles.headerBar}>
        <div className={styles.headerLeft}>
          {options.showLogo && (data.business?.logoUrl || data.logoUrl) && (
            <img
              src={data.business?.logoUrl || data.logoUrl}
              alt={data.business.name}
              className={styles.logo}
              style={{ maxHeight: '48px', maxWidth: '140px', objectFit: 'contain' }}
            />
          )}
          <div>
            <div className={styles.corporateTitle}>{data.business.name}</div>
            <div className={styles.subTitle}>Commercial Invoice &amp; Remittance Statement</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.invoiceBadge}>{invoiceTitle}</div>
          <div className={styles.metaRow}>
            <span>Invoice No:</span>
            <strong>{data.invoiceNumber}</strong>
          </div>
          <div className={styles.metaRow}>
            <span>Date:</span>
            <strong>{formatDate(data.invoiceDate, options.numberFormat)}</strong>
          </div>
          {data.billingPeriod && (
            <div className={styles.metaRow}>
              <span>Period:</span>
              <strong>{data.billingPeriod}</strong>
            </div>
          )}
          {data.dueDate && (
            <div className={styles.metaRow}>
              <span>Due Date:</span>
              <strong>{formatDate(data.dueDate, options.numberFormat)}</strong>
            </div>
          )}
          {data.placeOfSupply && (
            <div className={styles.metaRow}>
              <span>{isUS ? 'State / Jurisdiction:' : 'Place of Supply:'}</span>
              <strong>{data.placeOfSupply}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Parties Grid */}
      <div className={styles.partiesGrid}>
        <div className={styles.partyCol}>
          <div className={styles.partyLabel}>From</div>
          <div className={styles.partyName}>{data.business.name}</div>
          <div className={styles.partyDetails}>
            <div>{data.business.address}</div>
            <div>{data.business.city}, {data.business.state} - {data.business.pincode}</div>
            <div>Phone: {data.business.phone}</div>
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

        <div className={styles.partyCol}>
          <div className={styles.partyLabel}>Bill To</div>
          <div className={styles.partyName}>{data.client.name}</div>
          <div className={styles.partyDetails}>
            <div>{data.client.address}</div>
            <div>{data.client.city}, {data.client.state} - {data.client.pincode}</div>
            {data.client.phone && <div>Phone: {data.client.phone}</div>}
            {data.client.email && <div>Email: {data.client.email}</div>}
            {isUS ? (
              <>
                {data.client.ein && <div>EIN / Tax ID: <strong>{data.client.ein}</strong></div>}
                {data.client.taxExempt && <div style={{ color: '#059669', fontWeight: 600 }}>Tax-Exempt Entity</div>}
              </>
            ) : (
              data.client.gstin && <div>GSTIN: <strong>{data.client.gstin}</strong></div>
            )}
          </div>
        </div>
      </div>

      {/* Corporate Table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: '32px' }} className={styles.centerCol}>#</th>
            {showDateCol && <th style={{ width: '80px', whiteSpace: 'nowrap' }} className={styles.centerCol}>Date</th>}
            <th>Item &amp; Description</th>
            {options.showHsnSacColumn && <th style={{ width: '75px', whiteSpace: 'nowrap' }} className={styles.centerCol}>{codeHeader}</th>}
            <th style={{ width: '50px' }} className={styles.numCol}>Qty</th>
            <th style={{ width: '70px' }} className={styles.numCol}>Rate</th>
            {options.showDiscountColumn && <th style={{ width: '55px' }} className={styles.numCol}>Disc</th>}
            {(showGst || (isUS && hasTaxOnItems)) && <th style={{ width: '50px' }} className={styles.numCol}>{taxHeader}</th>}
            <th style={{ width: '85px' }} className={styles.numCol}>Total</th>
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
                <span className={styles.itemDesc}>{item.description}</span>
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
      <div className={styles.totalsSection}>
        <table className={styles.totalsTable}>
          <tbody>
            <tr>
              <td style={{ color: '#64748b' }}>Sub Total</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                {formatCurrency(data.subtotal, curSymbol, numFormat)}
              </td>
            </tr>
            {data.totalDiscount > 0 && (
              <>
                <tr>
                  <td style={{ color: '#64748b' }}>Total Discount</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>
                    -{formatCurrency(data.totalDiscount, curSymbol, numFormat)}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b' }}>Taxable Subtotal</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(data.totalTaxableAmount, curSymbol, numFormat)}
                  </td>
                </tr>
              </>
            )}
            {isUS ? (
              (data.totalSalesTax ?? 0) > 0 && (
                <tr>
                  <td style={{ color: '#64748b' }}>Sales Tax</td>
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
                      <td style={{ color: '#64748b' }}>CGST</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(data.totalCgst, curSymbol, numFormat)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748b' }}>SGST</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(data.totalSgst, curSymbol, numFormat)}
                      </td>
                    </tr>
                  </>
                )}
                {showGst && isInterState && (
                  <tr>
                    <td style={{ color: '#64748b' }}>IGST</td>
                    <td style={{ textAlign: 'right' }}>
                      {formatCurrency(data.totalIgst, curSymbol, numFormat)}
                    </td>
                  </tr>
                )}
              </>
            )}
            {data.roundOff !== 0 && (
              <tr>
                <td style={{ color: '#64748b' }}>Round Off</td>
                <td style={{ textAlign: 'right' }}>
                  {data.roundOff > 0 ? '+' : ''}{formatNumber(data.roundOff, numFormat)}
                </td>
              </tr>
            )}
            <tr className={styles.grandTotalRow}>
              <td>Total Due</td>
              <td style={{ textAlign: 'right' }}>
                {formatCurrency(data.grandTotalRounded, curSymbol, numFormat)}
              </td>
            </tr>
            {data.amountPaid > 0 && (
              <>
                <tr>
                  <td style={{ color: '#059669' }}>Amount Paid</td>
                  <td style={{ textAlign: 'right', color: '#059669' }}>
                    {formatCurrency(data.amountPaid, curSymbol, numFormat)}
                  </td>
                </tr>
                <tr style={{ fontWeight: 700 }}>
                  <td style={{ color: '#dc2626' }}>Balance Due</td>
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
        <div className={styles.amountWords}>
          <strong>Invoice Total in Words:</strong> {data.amountInWords}
        </div>
      )}

      {/* Tax Summary Table */}
      {options.showTaxSummaryTable && ((showGst && !isUS) || (isUS && (data.totalSalesTax ?? 0) > 0)) && data.taxSummary && data.taxSummary.length > 0 && (
        <table className={styles.taxSummaryTable}>
          <thead>
            <tr>
              <th>{isUS ? 'Tax Rate' : 'GST Rate'}</th>
              <th>Taxable Amount</th>
              {!isUS && !isInterState && <th>CGST Amount</th>}
              {!isUS && !isInterState && <th>SGST Amount</th>}
              {!isUS && isInterState && <th>IGST Amount</th>}
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

      {/* Bottom Section */}
      <div className={styles.bottomSection}>
        {/* Left: Bank details & Remittance */}
        <div>
          {options.showBankDetails && data.bankDetails && (
            <div className={styles.bankBox}>
              <div style={{ fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                {isUS ? 'Remittance & Payment Details' : 'Bank Account & Remittance'}
              </div>
              <div>Account Name: {data.bankDetails.accountName}</div>
              <div>Bank: {data.bankDetails.bankName} | A/c No: {data.bankDetails.accountNumber}</div>
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
                  <div>IFSC Code: {data.bankDetails.ifsc} {data.bankDetails.branch ? `| Branch: ${data.bankDetails.branch}` : ''}</div>
                  {data.bankDetails.upiId && <div>UPI ID: {data.bankDetails.upiId}</div>}
                </>
              )}
            </div>
          )}

          {!isUS && options.showUpiQr && getUpiQrString(data) && (
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
