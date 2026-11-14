// ─── Convert number to words (Indian & US Western systems) ───────────

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
 * Helper to convert 1 to 999 for Western / US numbering.
 */
function convertThreeDigitUS(n: number): string {
  let str = '';
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + ' Hundred';
    n %= 100;
    if (n > 0) str += ' ';
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 10)];
    if (n % 10 > 0) str += '-' + ones[n % 10];
  } else if (n > 0) {
    str += ones[n];
  }
  return str.trim();
}

/**
 * Western / US converter: Hundreds, Thousands, Millions, Billions, Trillions.
 */
function convertUSEnglishInteger(n: number): string {
  if (n === 0) return '';
  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];
  const chunks: string[] = [];
  let scaleIdx = 0;

  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      const chunkStr = convertThreeDigitUS(chunk);
      const scaleStr = scales[scaleIdx] ? ' ' + scales[scaleIdx] : '';
      chunks.unshift(chunkStr + scaleStr);
    }
    n = Math.floor(n / 1000);
    scaleIdx++;
  }

  return chunks.join(' ').trim();
}

/**
 * Convert a number to English words.
 * Supports both Indian numbering system (Lakh/Crore) and US system (Million/Billion).
 * If currency is 'Dollars', 'USD', or '$', it uses the standard US English convention.
 */
export function amountInWords(
  amount: number,
  currency = 'Rupees',
  subunit = 'Paise'
): string {
  const isUS =
    currency === 'Dollars' ||
    currency === 'USD' ||
    currency === '$' ||
    currency === 'Dollar';

  const defaultSubunit = isUS ? 'Cents' : subunit;
  const effectiveCurrency = isUS ? 'Dollars' : currency;

  if (isNaN(amount) || !isFinite(amount)) {
    return `Zero ${effectiveCurrency} Only`;
  }

  const absAmount = Math.abs(amount);
  const roundedAmount = Math.round(absAmount * 100) / 100;
  let intPart = Math.floor(roundedAmount);
  let decPart = Math.round((roundedAmount - intPart) * 100);

  if (decPart === 100) {
    intPart += 1;
    decPart = 0;
  }

  if (intPart === 0 && decPart === 0) {
    return `Zero ${effectiveCurrency} Only`;
  }

  let words = '';

  if (intPart > 0) {
    let currencyWord = effectiveCurrency;
    if (isUS) {
      currencyWord = intPart === 1 ? 'Dollar' : 'Dollars';
      words = convertUSEnglishInteger(intPart) + ' ' + currencyWord;
    } else {
      currencyWord = intPart === 1 && currency === 'Rupees' ? 'Rupee' : currency;
      words = convertIndianInteger(intPart) + ' ' + currencyWord;
    }
  }

  if (decPart > 0) {
    let subunitWord = defaultSubunit;
    if (isUS) {
      subunitWord = decPart === 1 ? 'Cent' : 'Cents';
      const decWords = convertThreeDigitUS(decPart);
      if (intPart > 0) {
        words += ' and ' + decWords + ' ' + subunitWord;
      } else {
        words = decWords + ' ' + subunitWord;
      }
    } else {
      subunitWord = decPart === 1 && subunit === 'Paise' ? 'Paisa' : subunit;
      if (intPart > 0) {
        words += ' and ' + convertIndianInteger(decPart) + ' ' + subunitWord;
      } else {
        words = convertIndianInteger(decPart) + ' ' + subunitWord;
      }
    }
  }

  words += ' Only';

  if (amount < 0) {
    words = 'Minus ' + words;
  }

  return words;
}
