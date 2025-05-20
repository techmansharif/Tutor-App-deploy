// PreprocessAudio.js

// Number-to-words converter for numbers -100 to 100
export const numberToWords = (num) => {
  const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if (num === 0) return 'zero';
  
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  if (absNum < 10) {
    return isNegative ? `minus ${units[absNum]}` : units[absNum];
  }
  if (absNum < 20) {
    return isNegative ? `minus ${teens[absNum - 10]}` : teens[absNum - 10];
  }
  if (absNum < 100) {
    const ten = Math.floor(absNum / 10);
    const unit = absNum % 10;
    const base = unit === 0 ? tens[ten] : `${tens[ten]} ${units[unit]}`;
    return isNegative ? `minus ${base}` : base;
  }
  return num.toString(); // Fallback for numbers > 100 or < -100
};

// Preprocess text to convert numbers to words
export const preprocessText = (text) => {
  return text.replace(/\b(-?\d+)\b/g, (match, num) => {
    const n = parseInt(num);
    if (n >= -100 && n <= 100) {
      return numberToWords(n);
    }
    return num; // Return original if out of range
  });
};

// Detect language based on text content
export const detectLanguage = (text) => {
  const banglaRegex = /[\u0980-\u09FF]/;
  return banglaRegex.test(text) ? 'bn-BD' : 'en-US';
};