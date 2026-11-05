// ─── Convert number to words (Indian system) ───────────────────────

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

/**
 * Recursive converter for Indian numbering system
 * Supports: Hundreds, Thousands, Lakhs, Crores (and multi-crore numbers)
 */
function convertIndianInteger(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + (o ? ' ' + ones[o] : '');
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let res = ones[h] + ' Hundred';
    if (rem) res += ' and ' + convertIndianInteger(rem);
    return res;
  }
  if (n < 100000) {
    const th = Math.floor(n / 1000);
    const rem = n % 1000;
    let res = convertIndianInteger(th) + ' Thousand';
    if (rem) res += ' ' + convertIndianInteger(rem);
    return res;
  }
  if (n < 10000000) {
    const lk = Math.floor(n / 100000);
    const rem = n % 100000;
    let res = convertIndianInteger(lk) + ' Lakh';
    if (rem) res += ' ' + convertIndianInteger(rem);
    return res;
  }
  const cr = Math.floor(n / 10000000);
  const rem = n % 10000000;
  let res = convertIndianInteger(cr) + ' Crore';
  if (rem) res += ' ' + convertIndianInteger(rem);
  return res;
}

/**
 * Convert a number to Indian English words.
 * Uses the Indian numbering system: Lakh, Crore.
 * e.g. 1234567.89 → "Twelve Lakh Thirty Four Thousand Five Hundred and Sixty Seven Rupees and Eighty Nine Paise Only"
 */
export function amountInWords(amount: number, currency = 'Rupees', subunit = 'Paise'): string {
  if (isNaN(amount) || !isFinite(amount)) return `Zero ${currency} Only`;

  const absAmount = Math.abs(amount);
  const roundedAmount = Math.round(absAmount * 100) / 100;
  let intPart = Math.floor(roundedAmount);
  let decPart = Math.round((roundedAmount - intPart) * 100);

  if (decPart === 100) {
    intPart += 1;
    decPart = 0;
  }

  if (intPart === 0 && decPart === 0) return `Zero ${currency} Only`;

  let words = '';

  if (intPart > 0) {
    const currencyWord = intPart === 1 && currency === 'Rupees' ? 'Rupee' : currency;
    words = convertIndianInteger(intPart) + ' ' + currencyWord;
  }

  if (decPart > 0) {
    const subunitWord = decPart === 1 && subunit === 'Paise' ? 'Paisa' : subunit;
    if (intPart > 0) {
      words += ' and ' + convertIndianInteger(decPart) + ' ' + subunitWord;
    } else {
      words = convertIndianInteger(decPart) + ' ' + subunitWord;
    }
  }

  words += ' Only';

  if (amount < 0) {
    words = 'Minus ' + words;
  }

  return words;
}
