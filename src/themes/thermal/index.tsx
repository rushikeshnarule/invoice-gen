import React from 'react';
import type { ThemeComponentProps } from '../../types';
import { Watermark } from '../Watermark';
import { themeVars, getUpiQrString } from '../themeHelpers';
import { formatCurrency, formatNumber, formatDate, QRCodeView } from '../../utils';
import styles from './styles.module.css';

export const ThermalTheme: React.FC<ThemeComponentProps> = ({ data, options }) => {
  const showGst = data.gstType !== 'none';
  const isInterState = data.gstType === 'igst';

  return (
    <div
      className={styles.receiptContainer}
      style={{
        ...themeVars(options),
        fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
      }}
    >
      <Watermark options={options} status={data.status} />

      {/* Centred Header */}
      <div className={styles.centerHeader}>
        {options.showLogo && (data.business?.logoUrl || data.logoUrl) && (
          <div>
            <img
              src={data.business?.logoUrl || data.logoUrl}
              alt={data.business.name}
              className={styles.logo}
            />
          </div>
        )}
        <div className={styles.storeName}>{data.business.name}</div>
        <div className={styles.storeDetails}>
          <div>{data.business.address}</div>
          <div>{data.business.city}, {data.business.state} {data.business.pincode}</div>
          <div>PH: {data.business.phone}</div>
          {data.business.gstin && <div>GSTIN: {data.business.gstin}</div>}
        </div>
      </div>

      <div className={styles.dashedDivider} />

      {/* Receipt Meta */}
      <div className={styles.metaRow}>
        <span>INV: #{data.invoiceNumber}</span>
        <span>{formatDate(data.invoiceDate, options.numberFormat)}</span>
      </div>
      <div className={styles.metaRow}>
        <span>CUST: {data.client.name}</span>
        {data.client.phone && <span>{data.client.phone}</span>}
      </div>
      {data.client.gstin && (
        <div className={styles.metaRow}>
          <span>GSTIN: {data.client.gstin}</span>
        </div>
      )}

      <div className={styles.dashedDivider} />

      {/* Items in Receipt format: Name on one line, qty x rate = amount on next line */}
      <div className={styles.itemList}>
        {data.items.map((item, idx) => (
          <div key={item.id || idx} className={styles.itemRow}>
            <div className={styles.itemName}>
              {idx + 1}. {item.description}
              {options.showHsnSacColumn && item.hsnSac ? ` [HSN: ${item.hsnSac}]` : ''}
            </div>
            <div className={styles.itemMath}>
              <span>
                {item.quantity} {item.unit || ''} x {formatNumber(item.rate, options.numberFormat)}
                {options.showDiscountColumn && item.discount ? ` (-${item.discount}%)` : ''}
              </span>
              <strong>{formatNumber(item.total, options.numberFormat)}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.dashedDivider} />

      {/* Totals */}
      <div className={styles.totalsBlock}>
        <div className={styles.totalRow}>
          <span>SUBTOTAL:</span>
          <span>{formatCurrency(data.subtotal, options.currencySymbol, options.numberFormat)}</span>
        </div>
        {data.totalDiscount > 0 && (
          <>
            <div className={styles.totalRow}>
              <span>DISCOUNT:</span>
              <span>-{formatCurrency(data.totalDiscount, options.currencySymbol, options.numberFormat)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>TAXABLE:</span>
              <span>{formatCurrency(data.totalTaxableAmount, options.currencySymbol, options.numberFormat)}</span>
            </div>
          </>
        )}
        {showGst && !isInterState && (
          <>
            <div className={styles.totalRow}>
              <span>CGST:</span>
              <span>{formatCurrency(data.totalCgst, options.currencySymbol, options.numberFormat)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>SGST:</span>
              <span>{formatCurrency(data.totalSgst, options.currencySymbol, options.numberFormat)}</span>
            </div>
          </>
        )}
        {showGst && isInterState && (
          <div className={styles.totalRow}>
            <span>IGST:</span>
            <span>{formatCurrency(data.totalIgst, options.currencySymbol, options.numberFormat)}</span>
          </div>
        )}
        {data.roundOff !== 0 && (
          <div className={styles.totalRow}>
            <span>ROUND OFF:</span>
            <span>{data.roundOff > 0 ? '+' : ''}{formatNumber(data.roundOff, options.numberFormat)}</span>
          </div>
        )}

        <div className={styles.doubleDivider} />

        <div className={styles.grandTotalRow}>
          <span>TOTAL:</span>
          <span>{formatCurrency(data.grandTotalRounded, options.currencySymbol, options.numberFormat)}</span>
        </div>

        <div className={styles.doubleDivider} />

        {data.amountPaid > 0 && (
          <>
            <div className={styles.totalRow}>
              <span>PAID:</span>
              <span>{formatCurrency(data.amountPaid, options.currencySymbol, options.numberFormat)}</span>
            </div>
            <div className={styles.totalRow} style={{ fontWeight: 700 }}>
              <span>BALANCE:</span>
              <span>{formatCurrency(data.balanceDue, options.currencySymbol, options.numberFormat)}</span>
            </div>
          </>
        )}
      </div>

      {/* UPI QR Code */}
      {options.showUpiQr && getUpiQrString(data) && (
        <div className={styles.qrContainer}>
          <div style={{ fontSize: '7.5pt', marginBottom: 4, fontWeight: 700 }}>
            SCAN &amp; PAY VIA UPI
          </div>
          <QRCodeView
            data={getUpiQrString(data)}
            size={80}
          />
          {data.bankDetails?.upiId && (
            <div style={{ fontSize: '7pt', marginTop: 2 }}>{data.bankDetails.upiId}</div>
          )}
        </div>
      )}

      {/* Bank Details */}
      {options.showBankDetails && data.bankDetails && (
        <div style={{ fontSize: '7pt', textAlign: 'center', marginTop: 6 }}>
          <div>BANK: {data.bankDetails.bankName}</div>
          <div>A/C: {data.bankDetails.accountNumber} | IFSC: {data.bankDetails.ifsc}</div>
        </div>
      )}

      {/* Optional Stamp / Signature on Thermal */}
      {((options.showStamp && (data.stampUrl || data.business?.stampUrl)) || (options.showSignature && (data.signatureUrl || data.business?.signatureUrl))) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px', marginBottom: '6px' }}>
          {options.showStamp && (data.stampUrl || data.business?.stampUrl) && (
            <img
              src={data.stampUrl || data.business?.stampUrl}
              alt="Seal"
              style={{ maxHeight: '36px', maxWidth: '60px', objectFit: 'contain' }}
            />
          )}
          {options.showSignature && (data.signatureUrl || data.business?.signatureUrl) && (
            <img
              src={data.signatureUrl || data.business?.signatureUrl}
              alt="Signature"
              style={{ maxHeight: '32px', maxWidth: '70px', objectFit: 'contain' }}
            />
          )}
        </div>
      )}

      {/* Footer / Notes / Terms */}
      {(options.showThankYouFooter || options.footerText || (options.showNotes && data.notes) || (options.showTerms && data.terms)) && (
        <div className={styles.footer}>
          {options.showNotes && data.notes && <div>{data.notes}</div>}
          {options.showTerms && data.terms && <div style={{ marginTop: 2 }}>Terms: {data.terms}</div>}
          {options.showThankYouFooter && <div style={{ marginTop: 4 }}>THANK YOU! VISIT AGAIN</div>}
          {options.footerText && <div style={{ marginTop: 2 }}>{options.footerText}</div>}
        </div>
      )}
    </div>
  );
};

export default ThermalTheme;
