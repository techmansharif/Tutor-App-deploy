import MarkdownIt from 'markdown-it';

// ==================== NUMBER TO WORDS CONVERSION ====================

// English number to words conversion
export const numberToWords = (num) => {
  if (typeof num !== 'number' || isNaN(num)) return num.toString();
  
  const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if (num === 0) return 'zero';

  const isNegative = num < 0;
  let absNum = Math.abs(num);

  // Handle decimal numbers
  if (String(num).includes('.')) {
    const parts = String(absNum).split('.');
    const integerPart = parseInt(parts[0]);
    const decimalPart = parts[1];

    let result = '';
    if (integerPart > 0) {
      result += numberToWords(integerPart) + ' point';
    } else {
      result += 'zero point';
    }

    // Convert each decimal digit
    for (let i = 0; i < decimalPart.length; i++) {
      result += ' ' + numberToWords(parseInt(decimalPart[i]));
    }

    return isNegative ? 'minus ' + result : result;
  }

  // Handle whole numbers
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
  if (absNum < 1000) {
    const hundred = Math.floor(absNum / 100);
    const remainder = absNum % 100;
    const base = remainder === 0
      ? `${units[hundred]} hundred`
      : `${units[hundred]} hundred ${numberToWords(remainder)}`;
    return isNegative ? `minus ${base}` : base;
  }
  if (absNum < 1000000) {
    const thousand = Math.floor(absNum / 1000);
    const remainder = absNum % 1000;
    const base = remainder === 0
      ? `${numberToWords(thousand)} thousand`
      : `${numberToWords(thousand)} thousand ${numberToWords(remainder)}`;
    return isNegative ? `minus ${base}` : base;
  }
  
  // For very large numbers, return as string
  return num.toString();
};

// Bengali number to words conversion
const convertEnglishNumberToBanglaWords = (num) => {
  if (typeof num !== 'number' || isNaN(num)) return num.toString();
  
  const units = ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'];
  const teens = ['দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ'];
  const tens = ['', 'দশ', 'বিশ', 'ত্রিশ', 'চল্লিশ', 'পঞ্চাশ', 'ষাট', 'সত্তর', 'আশি', 'নব্বই'];
  const hundreds = ['', 'এক শত', 'দুই শত', 'তিন শত', 'চার শত', 'পাঁচ শত', 'ছয় শত', 'সাত শত', 'আট শত', 'নয় শত'];

  if (num === 0) return 'শূন্য';

  const isNegative = num < 0;
  let absNum = Math.abs(num);

  // Handle decimal numbers
  if (String(num).includes('.')) {
    const parts = String(absNum).split('.');
    const integerPart = parseInt(parts[0]);
    const decimalPart = parts[1];

    let result = '';
    if (integerPart > 0) {
      result += convertEnglishNumberToBanglaWords(integerPart) + ' দশমিক';
    } else {
      result += 'শূন্য দশমিক';
    }

    // Convert each decimal digit
    for (let i = 0; i < decimalPart.length; i++) {
      result += ' ' + convertEnglishNumberToBanglaWords(parseInt(decimalPart[i]));
    }

    return isNegative ? 'মাইনাস ' + result : result;
  }

  // Handle whole numbers
  if (absNum < 10) {
    return isNegative ? `মাইনাস ${units[absNum]}` : units[absNum];
  }
  if (absNum < 20) {
    return isNegative ? `মাইনাস ${teens[absNum - 10]}` : teens[absNum - 10];
  }
  if (absNum < 100) {
    const ten = Math.floor(absNum / 10);
    const unit = absNum % 10;
    const base = unit === 0 ? tens[ten] : `${tens[ten]} ${units[unit]}`;
    return isNegative ? `মাইনাস ${base}` : base;
  }
  if (absNum < 1000) {
    const hundred = Math.floor(absNum / 100);
    const remainder = absNum % 100;
    const base = remainder === 0
      ? hundreds[hundred]
      : `${hundreds[hundred]} ${convertEnglishNumberToBanglaWords(remainder)}`;
    return isNegative ? `মাইনাস ${base}` : base;
  }
  if (absNum < 100000) {
    const thousand = Math.floor(absNum / 1000);
    const remainder = absNum % 1000;
    const base = remainder === 0
      ? `${convertEnglishNumberToBanglaWords(thousand)} হাজার`
      : `${convertEnglishNumberToBanglaWords(thousand)} হাজার ${convertEnglishNumberToBanglaWords(remainder)}`;
    return isNegative ? `মাইনাস ${base}` : base;
  }
  if (absNum < 10000000) {
    const lakh = Math.floor(absNum / 100000);
    const remainder = absNum % 100000;
    const base = remainder === 0
      ? `${convertEnglishNumberToBanglaWords(lakh)} লক্ষ`
      : `${convertEnglishNumberToBanglaWords(lakh)} লক্ষ ${convertEnglishNumberToBanglaWords(remainder)}`;
    return isNegative ? `মাইনাস ${base}` : base;
  }
  
  // For very large numbers, return as string
  return num.toString();
};

// ==================== MATH SYMBOLS ====================

// English math symbols for TTS
const mathSymbols = {
  '\\+': 'plus',
  '\\-': 'minus',
  '\\*': 'times',
  '×': 'times',
  '/': 'divided by',
  '÷': 'divided by',
  '=': 'equals',
  '==': 'equals',
  '≈': 'approximately equals',
  '≠': 'not equal to',
  '>': 'greater than',
  '<': 'less than',
  '≥': 'greater than or equal to',
  '≤': 'less than or equal to',
  '\\^': 'to the power of',
  '√': 'square root of',
  '∛': 'cube root of',
  '∈': 'is an element of',
  '∉': 'is not an element of',
  '⊂': 'is a subset of',
  '⊃': 'is a superset of',
  '∪': 'union',
  '∩': 'intersection',
  '∞': 'infinity',
  'π': 'pi',
  'θ': 'theta',
  'α': 'alpha',
  'β': 'beta',
  'γ': 'gamma',
  'δ': 'delta',
  'ε': 'epsilon',
  'λ': 'lambda',
  'μ': 'mu',
  'σ': 'sigma',
  'Σ': 'sigma',
  'Δ': 'delta',
  '∅': 'empty set',
  'ℕ': 'natural numbers',
  'ℤ': 'integers',
  'ℚ': 'rational numbers',
  'ℝ': 'real numbers',
  'ℂ': 'complex numbers',
  '%': 'percent',
  '\\$': 'dollars',
  '€': 'euros',
  '£': 'pounds',
  '¥': 'yen',
  '°': 'degrees',
  '′': 'prime',
  '″': 'double prime',
  '\\|': 'or',
  '&': 'and',
  '\\{': 'open brace',
  '\\}': 'close brace',
  '\\[': 'open bracket',
  '\\]': 'close bracket',
  '\\(': 'open parenthesis',
  '\\)': 'close parenthesis',
  '\\.\\.\\.': 'and so on',
  '\\times': 'times',
  '\\div': 'divided by',
  '\\frac': '',
  '\\text': '',
  '\\left': '',
  '\\right': '',
  '\\big': '',
  '\\Big': '',
  '\\bigg': '',
  '\\Bigg': '',
};

// Bengali math symbols for TTS
const banglaMathSymbols = {
  '\\+': 'যোগ',
  '\\-': 'বিয়োগ',
  '\\*': 'গুণ',
  '×': 'গুণ',
  '/': 'ভাগ',
  '÷': 'ভাগ',
  '=': 'সমান',
  '==': 'সমান',
  '≈': 'প্রায় সমান',
  '≠': 'সমান নয়',
  '>': 'বড়',
  '<': 'ছোট',
  '≥': 'বড় বা সমান',
  '≤': 'ছোট বা সমান',
  '\\^': 'এর ঘাত',
  '√': 'বর্গমূল',
  '∛': 'ঘনমূল',
  '∈': 'এর উপাদান',
  '∉': 'এর উপাদান নয়',
  '⊂': 'এর উপসেট',
  '⊃': 'এর সুপারসেট',
  '∪': 'যোগফল',
  '∩': 'ছেদ',
  '∞': 'অসীম',
  'π': 'পাই',
  'θ': 'থিটা',
  'α': 'আলফা',
  'β': 'বিটা',
  'γ': 'গামা',
  'δ': 'ডেল্টা',
  'ε': 'এপসিলন',
  'λ': 'ল্যাম্বডা',
  'μ': 'মিউ',
  'σ': 'সিগমা',
  'Σ': 'সিগমা',
  'Δ': 'ডেল্টা',
  '∅': 'খালি সেট',
  'ℕ': 'প্রাকৃতিক সংখ্যা',
  'ℤ': 'পূর্ণসংখ্যা',
  'ℚ': 'মূলদ সংখ্যা',
  'ℝ': 'বাস্তব সংখ্যা',
  'ℂ': 'জটিল সংখ্যা',
  '%': 'শতাংশ',
  '\\$': 'ডলার',
  '€': 'ইউরো',
  '£': 'পাউন্ড',
  '¥': 'ইয়েন',
  '°': 'ডিগ্রি',
  '′': 'প্রাইম',
  '″': 'ডাবল প্রাইম',
  '\\|': 'বা',
  '&': 'এবং',
  '\\{': 'সেট শুরু',
  '\\}': 'সেট শেষ',
  '\\[': 'বন্ধনী শুরু',
  '\\]': 'বন্ধনী শেষ',
  '\\(': 'কোষ্ঠক শুরু',
  '\\)': 'কোষ্ঠক শেষ',
  '\\.\\.\\.': 'ইত্যাদি',
  '\\times': 'গুণ',
  '\\div': 'ভাগ',
  '\\frac': '',
  '\\text': '',
  '\\left': '',
  '\\right': '',
  '\\big': '',
  '\\Big': '',
  '\\bigg': '',
  '\\Bigg': '',
};

// ==================== TEXT CLEANING ====================

// Clean text from unwanted punctuation and formatting for TTS
const cleanPunctuation = (text, language = 'en-US') => {
  if (!text || typeof text !== 'string') return '';
  
  let cleaned = text;
  
  // Remove emojis and special Unicode characters
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  
  // Common punctuation cleaning rules
  const punctuationRules = {
    // Remove formatting asterisks
    '\\*{1,3}([^*]+)\\*{1,3}': '$1', // *text*, **text**, ***text***
    
    // Handle hyphens in compound words
    '([a-zA-Z]+)-([a-zA-Z]+)': '$1 $2', // twenty-one → twenty one
    
    // Remove multiple hyphens (formatting)
    '--+': ' ',
    
    // Remove bullet points and list markers
    '^\\s*[•·▪▫‣⁃]\\s*': '',
    '^\\s*[-*+]\\s+': '',
    
    // Handle parentheses content - keep content but remove parentheses
    '\\(([^)]+)\\)': ' $1 ',
    
    // Handle square brackets
    '\\[([^\\]]+)\\]': ' $1 ',
    
    // Multiple dots/periods
    '\\.{2,}': ' ',
    
    // Remove underscores (formatting)
    '_{1,}': ' ',
    
    // Remove hashtags for headers
    '#{1,6}\\s*': '',
    
    // Remove backticks (code formatting)
    '`+': '',
    
    // Remove tildes
    '~+': '',
    
    // Clean LaTeX commands
    '\\\\text\\{([^}]+)\\}': '$1',
    '\\\\[a-zA-Z]+\\{([^}]*)\\}': '$1',
    '\\\\[a-zA-Z]+': '',
    
    // Multiple spaces
    '\\s{2,}': ' ',
    
    // Clean up commas and periods
    ',\\s*,': ',',
    '\\.\\s*\\.': '.',
    
    // Remove @ symbols
    '@': '',
    
    // Handle quotes
    '["\'`]': '',
    
    // Handle colons in non-time contexts
    '(?<!\\d):\\s*(?!\\d)': ', ',
    
    // Handle semicolons
    ';': ',',
  };
  
  // Apply cleaning rules
  Object.keys(punctuationRules).forEach(pattern => {
    try {
      const regex = new RegExp(pattern, 'g');
      cleaned = cleaned.replace(regex, punctuationRules[pattern]);
    } catch (error) {
      console.warn(`Error applying punctuation rule: ${pattern}`, error);
    }
  });
  
  // Language-specific cleaning
  if (language === 'bn-BD') {
    // Additional Bengali-specific cleaning
    cleaned = cleaned.replace(/[•·▪▫‣⁃]/g, '');
    cleaned = cleaned.replace(/\*+/g, '');
    cleaned = cleaned.replace(/_{2,}/g, ' ');
    cleaned = cleaned.replace(/#+/g, '');
    cleaned = cleaned.replace(/@/g, '');
    cleaned = cleaned.replace(/`+/g, '');
    cleaned = cleaned.replace(/~+/g, '');
  }
  
  return cleaned.trim();
};

// ==================== MATH EXPRESSION PROCESSING ====================

const processMathExpression = (expr, language = 'en-US') => {
  if (!expr || typeof expr !== 'string') return '';
  
  const isEnglish = language === 'en-US';
  const symbols = isEnglish ? mathSymbols : banglaMathSymbols;
  
  let processed = expr;
  
  // Handle LaTeX fractions
  processed = processed.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (match, numerator, denominator) => {
    const numProcessed = processMathExpression(numerator, language);
    const denomProcessed = processMathExpression(denominator, language);
    return isEnglish 
      ? `${numProcessed} divided by ${denomProcessed}`
      : `${numProcessed} ভাগ ${denomProcessed}`;
  });
  
  // Handle superscripts (powers)
  if (isEnglish) {
    processed = processed.replace(/\$?([a-zA-Z])\^2\$?/g, '$1 squared');
    processed = processed.replace(/\$?([a-zA-Z])\^3\$?/g, '$1 cubed');
    processed = processed.replace(/\$?([a-zA-Z])\^(\d+)\$?/g, (match, varName, exp) => {
      const expNum = parseInt(exp);
      if (expNum === 2) return `${varName} squared`;
      if (expNum === 3) return `${varName} cubed`;
      return `${varName} to the power of ${numberToWords(expNum)}`;
    });
    
    // Handle numeric superscripts
    processed = processed.replace(/(\d+)\^(\d+)/g, (match, base, exp) => {
      const baseNum = parseInt(base);
      const expNum = parseInt(exp);
      if (expNum === 2) return `${numberToWords(baseNum)} squared`;
      if (expNum === 3) return `${numberToWords(baseNum)} cubed`;
      return `${numberToWords(baseNum)} to the power of ${numberToWords(expNum)}`;
    });
  } else {
    processed = processed.replace(/\$?([a-zA-Z])\^2\$?/g, '$1 এর বর্গ');
    processed = processed.replace(/\$?([a-zA-Z])\^3\$?/g, '$1 এর ঘন');
    processed = processed.replace(/\$?([a-zA-Z])\^(\d+)\$?/g, (match, varName, exp) => {
      const expNum = parseInt(exp);
      if (expNum === 2) return `${varName} এর বর্গ`;
      if (expNum === 3) return `${varName} এর ঘন`;
      return `${varName} এর ঘাত ${convertEnglishNumberToBanglaWords(expNum)}`;
    });
    
    // Handle numeric superscripts
    processed = processed.replace(/(\d+)\^(\d+)/g, (match, base, exp) => {
      const baseNum = parseInt(base);
      const expNum = parseInt(exp);
      if (expNum === 2) return `${convertEnglishNumberToBanglaWords(baseNum)} এর বর্গ`;
      if (expNum === 3) return `${convertEnglishNumberToBanglaWords(baseNum)} এর ঘন`;
      return `${convertEnglishNumberToBanglaWords(baseNum)} এর ঘাত ${convertEnglishNumberToBanglaWords(expNum)}`;
    });
  }
  
  // Remove LaTeX dollar signs
  processed = processed.replace(/\$/g, '');
  
  // Handle range notation
  if (isEnglish) {
    processed = processed.replace(/(\d+)\s*≤\s*([a-zA-Z])\s*≤\s*(\d+)/g, 
      (match, min, variable, max) => `${variable} from ${numberToWords(parseInt(min))} to ${numberToWords(parseInt(max))} inclusive`);
    processed = processed.replace(/\{([^:]+):([^}]+)\}/g, 'the set of $1 such that $2');
  } else {
    processed = processed.replace(/(\d+)\s*≤\s*([a-zA-Z])\s*≤\s*(\d+)/g, 
      (match, min, variable, max) => `${variable} ${convertEnglishNumberToBanglaWords(parseInt(min))} থেকে ${convertEnglishNumberToBanglaWords(parseInt(max))} পর্যন্ত`);
    processed = processed.replace(/\{([^:]+):([^}]+)\}/g, 'সেট $1 যেখানে $2');
  }
  
  // Replace math symbols
  Object.keys(symbols).forEach((symbol) => {
    if (symbols[symbol] === '') return; // Skip empty replacements
    
    try {
      // Handle special cases for minus and plus
      if (symbol === '\\-' && isEnglish) {
        // Only replace minus in clear mathematical contexts
        processed = processed.replace(/(\d+)\s*-\s*(\d+)/g, '$1 minus $2');
        processed = processed.replace(/([=<>≤≥])\s*-\s*(\d+)/g, '$1 minus $2');
      } else if (symbol === '\\+') {
        // Handle plus signs
        processed = processed.replace(/(\d+)\s*\+\s*(\d+)/g, `$1 ${symbols[symbol]} $2`);
      } else if (symbol === '\\*' || symbol === '×') {
        // Handle multiplication
        processed = processed.replace(/(\d+)\s*[\*×]\s*(\d+)/g, `$1 ${symbols[symbol]} $2`);
        processed = processed.replace(/([a-zA-Z])\s*[\*×]\s*([a-zA-Z])/g, `$1 ${symbols[symbol]} $2`);
      } else if (symbol === '/' || symbol === '÷') {
        // Handle division
        processed = processed.replace(/(\d+)\s*[/÷]\s*(\d+)/g, `$1 ${symbols[symbol]} $2`);
      } else if (symbol !== '\\-') {
        // Handle other symbols
        const escapedSymbol = symbol.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        processed = processed.replace(new RegExp(escapedSymbol, 'g'), ` ${symbols[symbol]} `);
      }
    } catch (error) {
      console.warn(`Error processing symbol: ${symbol}`, error);
    }
  });
  
  return processed.replace(/\s+/g, ' ').trim();
};

// ==================== LANGUAGE DETECTION ====================

// Enhanced language detection
export const detectLanguage = (text) => {
  if (!text || typeof text !== 'string') return 'en-US';
  
  // Bengali Unicode range
  const banglaRegex = /[\u0980-\u09FF]/;
  
  // Common Bengali words
  const banglaWords = /(এক|দুই|তিন|চার|পাঁচ|ছয়|সাত|আট|নয়|দশ|গণিত|বিজ্ঞান|ইতিহাস|বাংলা|অধ্যায়|পাঠ|সমস্যা|সমাধান|উত্তর|প্রশ্ন|যোগ|বিয়োগ|গুণ|ভাগ|সমান|বর্গ|ঘন|মূল|সেট|এর|হলো|হবে|আছে|করে|করা|তার|সেই|এই|যে|কি|কেন|কিভাবে|যেমন|তেমন|অথবা|এবং|কিন্তু|তবে|যদি|তাহলে)/;
  
  // Bengali mathematical terms
  const banglaMathWords = /(বর্গ|ঘন|মূল|সেট|যোগ|বিয়োগ|গুণ|ভাগ|সমান|বড়|ছোট|শতাংশ|ঘাত|উপাদান|দশমিক|মাইনাস|পাই|থিটা|আলফা|বিটা|গামা|ডেল্টা|সিগমা|অসীম|ডিগ্রি)/;
  
  // Check for Bengali indicators
  const hasBanglaChars = banglaRegex.test(text);
  const hasBanglaWords = banglaWords.test(text);
  const hasBanglaMathWords = banglaMathWords.test(text);
  
  // Calculate Bengali confidence
  const banglaCharCount = (text.match(banglaRegex) || []).length;
  const totalChars = text.length;
  const banglaRatio = banglaCharCount / totalChars;
  
  // Return Bengali if any strong indicators are found
  if (hasBanglaChars || hasBanglaWords || hasBanglaMathWords || banglaRatio > 0.1) {
    return 'bn-BD';
  }
  
  return 'en-US';
};

// ==================== MARKDOWN PROCESSING ====================

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: false
});

const processMarkdown = (text, language = 'en-US') => {
  if (!text || typeof text !== 'string') return '';
  
  const isEnglish = language === 'en-US';
  
  // Protect numbers from markdown processing
  const numberPlaceholder = 'NUM_PLACEHOLDER_';
  let numberMap = new Map();
  let numberCounter = 0;
  
  text = text.replace(/\b(-?\d+\.?\d*)\b/g, (match) => {
    const placeholder = `${numberPlaceholder}${numberCounter++}`;
    numberMap.set(placeholder, match);
    return placeholder;
  });
  
  // Process tables
  const tableRegex = /\|(.+?)\|\n\|[-:\s|]+\|\n((?:\|.+?\|\n?)+)/g;
  let processed = text;
  
  processed = processed.replace(tableRegex, (match, headerLine, rowsContent) => {
    try {
      const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);
      const rows = rowsContent.trim().split('\n').map(row => 
        row.split('|').map(cell => cell.trim()).filter(cell => cell)
      );
      
      const tableTitle = isEnglish ? "Data Table" : "তথ্য সারণী";
      let tableOutput = isEnglish 
        ? `Table with columns: ${headers.join(', ')}. `
        : `সারণী যার কলাম: ${headers.join(', ')}। `;
      
      rows.forEach((row, index) => {
        if (row.length > 0) {
          tableOutput += isEnglish ? `Row ${index + 1}: ` : `সারি ${convertEnglishNumberToBanglaWords(index + 1)}: `;
          row.forEach((cell, i) => {
            if (i < headers.length && cell) {
              tableOutput += isEnglish 
                ? `${headers[i]} is ${cell}`
                : `${headers[i]} হলো ${cell}`;
              if (i < row.length - 1) tableOutput += isEnglish ? '; ' : '; ';
            }
          });
          tableOutput += '। ';
        }
      });
      
      return tableOutput;
    } catch (error) {
      console.warn('Error processing table:', error);
      return match;
    }
  });
  
  // Process other markdown elements
  try {
    const tokens = md.parse(processed, {});
    let output = '';
    
    for (const token of tokens) {
      if (token.type === 'inline') {
        let content = token.content;
        // Convert bullet points to commas
        content = content.replace(/^\*\s+/gm, ', ');
        content = processMathExpression(content, language);
        output += content + ' ';
      } else if (token.type === 'paragraph_open') {
        output += '';
      } else if (token.type === 'paragraph_close') {
        output += ' ';
      } else if (token.type === 'heading_open') {
        output += isEnglish ? 'Heading: ' : 'শিরোনাম: ';
      } else if (token.type === 'heading_close') {
        output += '. ';
      } else if (token.type === 'list_item_open') {
        output += isEnglish ? 'Item: ' : 'আইটেম: ';
      } else if (token.type === 'list_item_close') {
        output += '. ';
      }
    }
    
    processed = output;
  } catch (error) {
    console.warn('Error processing markdown:', error);
  }
  
  // Restore numbers
  numberMap.forEach((value, placeholder) => {
    const num = parseFloat(value);
    const replacement = isEnglish 
      ? numberToWords(num) 
      : convertEnglishNumberToBanglaWords(num);
    processed = processed.replace(new RegExp(placeholder, 'g'), replacement);
  });
  
  return processed.trim();
};

// ==================== BENGALI TEXT PREPROCESSING ====================

const preprocessBanglaText = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  let processed = text;
  
  // Clean punctuation first
  processed = cleanPunctuation(processed, 'bn-BD');
  
  // Convert Bengali numerals to words
  const banglaNumbers = {
    '০': 'শূন্য', '১': 'এক', '২': 'দুই', '৩': 'তিন', '৪': 'চার',
    '৫': 'পাঁচ', '৬': 'ছয়', '৭': 'সাত', '৮': 'আট', '৯': 'নয়'
  };
  
  Object.keys(banglaNumbers).forEach(num => {
    processed = processed.replace(new RegExp(num, 'g'), banglaNumbers[num]);
  });
  
  // Convert English numbers to Bengali words
  processed = processed.replace(/\b(-?\d+\.?\d*)\b/g, (match) => {
    const num = parseFloat(match);
    return Number.isInteger(num) ? convertEnglishNumberToBanglaWords(num) : convertEnglishNumberToBanglaWords(num);
  });
  
  // Handle common mathematical variables
  processed = processed.replace(/(^|\s)([xyz])(\s|$)/gi, '$1এক্স$3');
  processed = processed.replace(/(^|\s)([abc])(\s|$)/gi, '$1$2$3');
  
  // Process markdown
  processed = processMarkdown(processed, 'bn-BD');
  
  // Process math expressions
  processed = processMathExpression(processed, 'bn-BD');
  
  // Handle set notation
  processed = processed.replace(/\{([^}]+)\}/g, (match, content) => {
    return `সেট ${processMathExpression(content, 'bn-BD')}`;
  });
  
  return processed.replace(/\s+/g, ' ').trim();
};

// ==================== MAIN PREPROCESSING FUNCTION ====================

// Main preprocessing function for TTS
export const preprocessForTTS = (text, language = 'auto') => {
  try {
    if (!text || typeof text !== 'string') return '';
    
    // Auto-detect language if not specified
    const detectedLanguage = language === 'auto' ? detectLanguage(text) : language;
    
    console.log(`Preprocessing text for TTS (${detectedLanguage}):`, text.substring(0, 100) + '...');
    
    if (detectedLanguage === 'bn-BD') {
      return preprocessBanglaText(text);
    } else {
      // English preprocessing
      let processed = text;
      
      // Clean punctuation first
      processed = cleanPunctuation(processed, detectedLanguage);
      
      // Process markdown
      processed = processMarkdown(processed, detectedLanguage);
      
      // Convert numbers to words
      processed = processed.replace(/\b(-?\d+\.?\d*)\b/g, (match) => {
        const num = parseFloat(match);
        return numberToWords(num);
      });
      
      // Handle mathematical variables (only in non-teaching contexts)
      const isTeachingContext = /(variable|constant|let|where)\s+[a-z]/i.test(processed);
      if (!isTeachingContext) {
        processed = processed.replace(/(^|\s)([xyz])(\s|$)/gi, '$1$2$3');
        processed = processed.replace(/(^|\s)([abc])(\s|$)/gi, '$1$2$3');
      }
      
      // Process math expressions
      processed = processMathExpression(processed, detectedLanguage);
      
      // Handle set notation
      processed = processed.replace(/\{([^}]+)\}/g, (match, content) => {
        return `the set ${processMathExpression(content, detectedLanguage)}`;
      });
      
      return processed.replace(/\s+/g, ' ').trim();
    }
  } catch (error) {
    console.error('Error in preprocessForTTS:', error);
    return text; // Return original text if preprocessing fails
  }
};

// ==================== LEGACY SUPPORT ====================

// Legacy function for backward compatibility
export const preprocessText = (text) => {
  return preprocessForTTS(text, 'auto');
};

// Export all functions for external use
export {
  convertEnglishNumberToBanglaWords,
  processMathExpression,
  cleanPunctuation,
  processMarkdown,
  preprocessBanglaText
};