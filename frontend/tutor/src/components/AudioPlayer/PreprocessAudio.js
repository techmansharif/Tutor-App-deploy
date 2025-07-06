// import MarkdownIt from 'markdown-it';

// // English number to words conversion
// export const numberToWords = (num) => {
//   const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
//   const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
//   const tens = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

//   if (num === 0) return 'zero';

//   const isNegative = num < 0;
//   let absNum = Math.abs(num);

//   if (String(num).includes('.')) {
//     const parts = String(absNum).split('.');
//     const integerPart = parseInt(parts[0]);
//     const decimalPart = parts[1];

//     let result = '';
//     if (integerPart > 0) {
//       result += numberToWords(integerPart) + ' point';
//     } else {
//       result += 'zero point';
//     }

//     for (let i = 0; i < decimalPart.length; i++) {
//       result += ' ' + numberToWords(parseInt(decimalPart[i]));
//     }

//     return isNegative ? 'minus ' + result : result;
//   }

//   if (absNum < 10) {
//     return isNegative ? `minus ${units[absNum]}` : units[absNum];
//   }
//   if (absNum < 20) {
//     return isNegative ? `minus ${teens[absNum - 10]}` : teens[absNum - 10];
//   }
//   if (absNum < 100) {
//     const ten = Math.floor(absNum / 10);
//     const unit = absNum % 10;
//     const base = unit === 0 ? tens[ten] : `${tens[ten]} ${units[unit]}`;
//     return isNegative ? `minus ${base}` : base;
//   }
//   if (absNum < 1000) {
//     const hundred = Math.floor(absNum / 100);
//     const remainder = absNum % 100;
//     const base = remainder === 0
//       ? `${units[hundred]} hundred`
//       : `${units[hundred]} hundred ${numberToWords(remainder)}`;
//     return isNegative ? `minus ${base}` : base;
//   }
//   return num.toString();
// };

// // Bengali number to words conversion
// const convertEnglishNumberToBanglaWords = (num) => {
//   const units = ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'];
//   const teens = ['দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ'];
//   const tens = ['', 'দশ', 'বিশ', 'ত্রিশ', 'চল্লিশ', 'পঞ্চাশ', 'ষাট', 'সত্তর', 'আশি', 'নব্বই'];
//   const hundreds = ['', 'এক শত', 'দুই শত', 'তিন শত', 'চার শত', 'পাঁচ শত', 'ছয় শত', 'সাত শত', 'আট শত', 'নয় শত'];

//   if (num === 0) return 'শূন্য';

//   const isNegative = num < 0;
//   let absNum = Math.abs(num);

//   if (String(num).includes('.')) {
//     const parts = String(absNum).split('.');
//     const integerPart = parseInt(parts[0]);
//     const decimalPart = parts[1];

//     let result = '';
//     if (integerPart > 0) {
//       result += convertEnglishNumberToBanglaWords(integerPart) + ' দশমিক';
//     } else {
//       result += 'শূন্য দশমিক';
//     }

//     for (let i = 0; i < decimalPart.length; i++) {
//       result += ' ' + convertEnglishNumberToBanglaWords(parseInt(decimalPart[i]));
//     }

//     return isNegative ? 'মাইনাস ' + result : result;
//   }

//   if (absNum < 10) {
//     return isNegative ? `মাইনাস ${units[absNum]}` : units[absNum];
//   }
//   if (absNum < 20) {
//     return isNegative ? `মাইনাস ${teens[absNum - 10]}` : teens[absNum - 10];
//   }
//   if (absNum < 100) {
//     const ten = Math.floor(absNum / 10);
//     const unit = absNum % 10;
//     const base = unit === 0 ? tens[ten] : `${tens[ten]} ${units[unit]}`;
//     return isNegative ? `মাইনাস ${base}` : base;
//   }
//   if (absNum < 1000) {
//     const hundred = Math.floor(absNum / 100);
//     const remainder = absNum % 100;
//     const base = remainder === 0
//       ? hundreds[hundred]
//       : `${hundreds[hundred]} ${convertEnglishNumberToBanglaWords(remainder)}`;
//     return isNegative ? `মাইনাস ${base}` : base;
//   }
//   if (absNum < 100000) {
//     const thousand = Math.floor(absNum / 1000);
//     const remainder = absNum % 1000;
//     const base = remainder === 0
//       ? `${convertEnglishNumberToBanglaWords(thousand)} হাজার`
//       : `${convertEnglishNumberToBanglaWords(thousand)} হাজার ${convertEnglishNumberToBanglaWords(remainder)}`;
//     return isNegative ? `মাইনাস ${base}` : base;
//   }
  
//   return num.toString(); // Fallback for larger numbers
// };

// // English math symbols
// const mathSymbols = {
//   '\\+': 'plus',
//   '-': 'minus',
//   '\\*': 'times',
//   '/': 'divided by',
//   '=': 'equals',
//   '\\^': 'to the power of',
//   '√': 'square root of',
//   '≤': 'less than or equal to',
//   '≥': 'greater than or equal to',
//   '≠': 'not equal to',
//   '∈': 'is an element of',
//   'ℝ': 'real numbers',
//   '\\{': 'the set',
//   '\\}': 'end set',
//   '\\$': '',
//   '\\|': '', // Ignore table pipes
//   ':-+': '', // Ignore table alignment
//   '-{2,}': '', // Ignore multiple dashes
//   '\\.\\.\\.': 'and so on',
// };

// // Bengali math symbols
// const banglaMathSymbols = {
//   '+': 'যোগ',
//   '\\+': 'যোগ',
//   '-': 'বিয়োগ',
//   '×': 'গুণ',
//   '\\*': 'গুণ',
//   '÷': 'ভাগ',
//   '/': 'ভাগ',
//   '=': 'সমান',
//   '>': 'বড়',
//   '<': 'ছোট',
//   '≥': 'বড় বা সমান',
//   '≤': 'ছোট বা সমান',
//   '≠': 'সমান নয়',
//   '√': 'বর্গমূল',
//   '%': 'শতাংশ',
//   '\\^': 'এর ঘাত',
//   '∈': 'এর উপাদান',
//   '\\{': 'সেট',
//   '\\}': 'সেট শেষ',
//   '\\$': '',
//   '\\|': '',
//   ':-+': '',
//   '-{2,}': '',
//   '\\.\\.\\.': 'ইত্যাদি',
// };

// // Clean text from unwanted punctuation sounds
// const cleanPunctuation = (text, language = 'en-US') => {
//   let cleaned = text;
  
//   // Remove or replace problematic punctuation
//   const punctuationRules = {
//     // Asterisks - remove completely for formatting
//     '\\*+': '',
    
//     // Hyphens in compound words - remove hyphen but keep words together
//     '([a-zA-Z]+)-([a-zA-Z]+)': '$1$2', // home-made → homemade
    
//     // Multiple hyphens (formatting) - remove completely
//     '--+': ' ',
    
//     // Bullet points and list markers
//     '^\\s*[•·▪▫‣⁃]\\s*': '', // Remove bullet points at start of lines
//     '^\\s*[-*+]\\s+': '',     // Remove dash/asterisk bullets at start
    
//     // Parentheses content (often formatting notes) - make it more natural
//     '\\(([^)]+)\\)': ', $1,', // (example) → , example,
    
//     // Multiple dots/periods
//     '\\.{3,}': ' and so on', // ... → and so on
    
//     // Underscores (often formatting)
//     '_+': ' ',
    
//     // Multiple spaces
//     '\\s{2,}': ' ',
    
//     // Clean up commas
//     ',\\s*,': ',', // Remove duplicate commas
    
//     // Clean up periods
//     '\\.\\s*\\.': '.', // Remove duplicate periods
//   };
  
//   // Apply cleaning rules
//   Object.keys(punctuationRules).forEach(pattern => {
//     const regex = new RegExp(pattern, 'g');
//     cleaned = cleaned.replace(regex, punctuationRules[pattern]);
//   });
  
//   // Language-specific cleaning
//   if (language === 'bn-BD') {
//     // Bengali-specific punctuation cleaning
//     cleaned = cleaned.replace(/[•·▪▫‣⁃]/g, ''); // Remove bullets
//     cleaned = cleaned.replace(/\*+/g, ''); // Remove asterisks
//     cleaned = cleaned.replace(/_{2,}/g, ' '); // Remove multiple underscores
//   }
  
//   return cleaned.trim();
// };

// const processMathExpression = (expr, language = 'en-US') => {
//   const isEnglish = language === 'en-US';
//   const symbols = isEnglish ? mathSymbols : banglaMathSymbols;

//   // Handle LaTeX superscripts
//   if (isEnglish) {
//     expr = expr.replace(/\$([a-zA-Z])\^2\$/g, '$1 squared');
//     expr = expr.replace(/\$([a-zA-Z])\^3\$/g, '$1 cubed');
//     expr = expr.replace(/\$([a-zA-Z])\^(\d+)\$/g, (match, varName, exp) => {
//       if (exp === '2') return `${varName} squared`;
//       if (exp === '3') return `${varName} cubed`;
//       return `${varName} to the power of ${numberToWords(parseInt(exp))}`;
//     });

//     // Handle non-LaTeX superscripts
//     expr = expr.replace(/([a-zA-Z])\^2/g, '$1 squared');
//     expr = expr.replace(/([a-zA-Z])\^3/g, '$1 cubed');
//     expr = expr.replace(/([a-zA-Z])\^(\d+)/g, (match, varName, exp) => {
//       if (exp === '2') return `${varName} squared`;
//       if (exp === '3') return `${varName} cubed`;
//       return `${varName} to the power of ${numberToWords(parseInt(exp))}`;
//     });
//   } else {
//     // Bengali superscripts
//     expr = expr.replace(/\$([a-zA-Z])\^2\$/g, '$1 এর বর্গ');
//     expr = expr.replace(/\$([a-zA-Z])\^3\$/g, '$1 এর ঘন');
//     expr = expr.replace(/\$([a-zA-Z])\^(\d+)\$/g, (match, varName, exp) => {
//       if (exp === '2') return `${varName} এর বর্গ`;
//       if (exp === '3') return `${varName} এর ঘন`;
//       return `${varName} এর ঘাত ${convertEnglishNumberToBanglaWords(parseInt(exp))}`;
//     });

//     expr = expr.replace(/([a-zA-Z])\^2/g, '$1 এর বর্গ');
//     expr = expr.replace(/([a-zA-Z])\^3/g, '$1 এর ঘন');
//     expr = expr.replace(/([a-zA-Z])\^(\d+)/g, (match, varName, exp) => {
//       if (exp === '2') return `${varName} এর বর্গ`;
//       if (exp === '3') return `${varName} এর ঘন`;
//       return `${varName} এর ঘাত ${convertEnglishNumberToBanglaWords(parseInt(exp))}`;
//     });
//   }

//   // Remove LaTeX markers
//   expr = expr.replace(/\$/g, '');

//   // Handle range notation
//   if (isEnglish) {
//     expr = expr.replace(/(\d+)\s*≤\s*([a-zA-Z])\s*≤\s*(\d+)/g, '$1 and $3 inclusive');
//     expr = expr.replace(/\{([^:]+):([^}]+)\}/g, 'the set $1 such that $2');
//   } else {
//     expr = expr.replace(/(\d+)\s*≤\s*([a-zA-Z])\s*≤\s*(\d+)/g, '$1 থেকে $3 পর্যন্ত');
//     expr = expr.replace(/\{([^:]+):([^}]+)\}/g, 'সেট $1 যেখানে $2');
//   }

//   // Replace math symbols - but be more selective
//   Object.keys(symbols).forEach((symbol) => {
//     if (symbol === '-' && isEnglish) {
//       // Only replace minus signs in clear mathematical contexts
//       expr = expr.replace(/(\d+)\s*-\s*(\d+)/g, '$1 minus $2'); // 5 - 3
//       expr = expr.replace(/([=<>])\s*-\s*(\d+)/g, '$1 minus $2'); // = -5
//     } else if (symbol === '\\+') {
//       // Handle plus signs in mathematical contexts
//       expr = expr.replace(/(\d+)\s*\+\s*(\d+)/g, '$1 plus $2'); // 5 + 3
//     } else if (symbol !== '-') {
//       // Handle other math symbols normally
//       const escapedSymbol = symbol.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
//       expr = expr.replace(new RegExp(escapedSymbol, 'g'), ` ${symbols[symbol]} `);
//     }
//   });

//   // Handle standalone colons
//   expr = expr.replace(/(^|\s):(\s|$)/g, '$1, $2');

//   return expr.replace(/\s+/g, ' ').trim();
// };

// // Enhanced Bengali text preprocessing
// const preprocessBanglaText = (text) => {
//   let processed = text;
  
//   // Clean punctuation first
//   processed = cleanPunctuation(processed, 'bn-BD');
  
//   // Bengali numerals to words
//   const banglaNumbers = {
//     '০': 'শূন্য', '১': 'এক', '২': 'দুই', '৩': 'তিন', '৪': 'চার',
//     '৫': 'পাঁচ', '৬': 'ছয়', '৭': 'সাত', '৮': 'আট', '৯': 'নয়'
//   };
  
//   // Replace Bengali numerals with words
//   Object.keys(banglaNumbers).forEach(num => {
//     processed = processed.replace(new RegExp(num, 'g'), banglaNumbers[num]);
//   });
  
//   // Handle English numbers in Bengali text
//   processed = processed.replace(/\b(\d+\.?\d*)\b/g, (match) => {
//     return convertEnglishNumberToBanglaWords(parseFloat(match));
//   });
  
//   // Process math expressions with Bengali context
//   processed = processMathExpression(processed, 'bn-BD');
  
//   // Handle set notation
//   processed = processed.replace(/\{([^}]+)\}/g, (match, content) => {
//     return `সেট ${processMathExpression(content, 'bn-BD')}`;
//   });
  
//   return processed.replace(/\s+/g, ' ').trim();
// };

// const md = new MarkdownIt();

// const processMarkdown = (text, language = 'en-US') => {
//   const isEnglish = language === 'en-US';
  
//   // Table processing
//   const tableRegex = /\|\s*(.+?)\s*\|\s*\n\|\s*[-:]+\s*\|\s*[-:]+\s*\|\s*[-:]+\s*\|\s*[-:]+\s*\|\s*\n((?:\|\s*.+?\s*\|\s*\n)+)/g;
//   const rowRegex = /\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*/;
  
//   let processed = text;
//   let match;
  
//   while ((match = tableRegex.exec(text)) !== null) {
//     const headerLine = match[1];
//     const rowsContent = match[2];
    
//     const headerMatch = rowRegex.exec('|' + headerLine + '|');
//     let headers = [];
//     if (headerMatch) {
//       for (let i = 1; i < headerMatch.length; i++) {
//         headers.push(processMathExpression(headerMatch[i].trim(), language));
//       }
//     }
    
//     const rowLines = rowsContent.trim().split('\n');
//     let rows = [];
    
//     rowLines.forEach(rowLine => {
//       const rowMatch = rowRegex.exec(rowLine);
//       if (rowMatch) {
//         let row = [];
//         for (let i = 1; i < rowMatch.length; i++) {
//           row.push(processMathExpression(rowMatch[i].trim(), language));
//         }
//         rows.push(row);
//       }
//     });
    
//     // Create speech-friendly table output
//     const tableTitle = text.match(/\*\*([^*]+)\*\*/)?.[1] || (isEnglish ? "Summary Table" : "সারণী");
//     let tableOutput = isEnglish 
//       ? `Table titled "${processMathExpression(tableTitle, language)}". Columns are: ${headers.join(', ')}. `
//       : `সারণী "${processMathExpression(tableTitle, language)}"। কলাম সমূহ: ${headers.join(', ')}। `;
    
//     rows.forEach((row, index) => {
//       tableOutput += isEnglish ? `Row ${index + 1}: ` : `সারি ${convertEnglishNumberToBanglaWords(index + 1)}: `;
//       row.forEach((cell, i) => {
//         if (i < headers.length) {
//           tableOutput += isEnglish 
//             ? `${headers[i]} is ${cell}`
//             : `${headers[i]} হলো ${cell}`;
//           if (i < row.length - 1) {
//             tableOutput += isEnglish ? '; ' : '; ';
//           }
//         }
//       });
//       tableOutput += '। ';
//     });
    
//     processed = processed.replace(match[0], tableOutput);
//   }
  
//   const tokens = md.parse(processed, {});
//   let output = '';
//   let inTable = false;
  
//   for (const token of tokens) {
//     if (token.type === 'table_open') {
//       inTable = true;
//     } else if (token.type === 'table_close') {
//       inTable = false;
//     } else if (token.type === 'inline' && !inTable) {
//       let content = token.content;
//       content = content.replace(/^\*\s+/gm, ', ');
//       content = processMathExpression(content, language);
//       output += content + ' ';
//     }
//   }

//   return output.trim();
// };

// // Enhanced language detection
// export const detectLanguage = (text) => {
//   const banglaRegex = /[\u0980-\u09FF]/;
//   const banglaWords = /(এক|দুই|তিন|চার|পাঁচ|ছয়|সাত|আট|নয়|দশ|গণিত|বিজ্ঞান|ইতিহাস|বাংলা|অধ্যায়|পাঠ|সমস্যা|সমাধান|উত্তর|প্রশ্ন)/;
//   const banglaCommonWords = /(হলো|হবে|আছে|করে|করা|এর|তার|সেই|এই|যে|কি|কেন|কিভাবে|যেমন|তেমন|অথবা|এবং|কিন্তু|তবে|যদি|তাহলে)/;
  
//   return (banglaRegex.test(text) || banglaWords.test(text) || banglaCommonWords.test(text)) ? 'bn-BD' : 'en-US';
// };

// // Main preprocessing function
// export const preprocessText = (text) => {
//   const language = detectLanguage(text);
  
//   if (language === 'bn-BD') {
//     return preprocessBanglaText(text);
//   } else {
//     // English preprocessing
//     let processed = text;
    
//     // Clean punctuation first (before other processing)
//     processed = cleanPunctuation(processed, language);
    
//     // Process markdown
//     processed = processMarkdown(processed, language);

//     // Process numbers
//     processed = processed.replace(/\b(-?\d+\.?\d*)\b/g, (match) => {
//       return numberToWords(parseFloat(match));
//     });

//     // Handle variables/constants
//     const isTeachingContext = /(variable|constant)\s+[a-z]/i.test(processed);
//     if (!isTeachingContext) {
//       processed = processed.replace(/(^|\s)([xyz])(\s|$)/gi, '$1$2$3');
//       processed = processed.replace(/(^|\s)([abc])(\s|$)/gi, '$1$2$3');
//     }

//     // Handle set notation
//     processed = processed.replace(/\{([^}]+)\}/g, (match, content) => {
//       return `the set ${processMathExpression(content, language)}`;
//     });

//     return processed.replace(/\s+/g, ' ').trim();
//   }
// };


import MarkdownIt from 'markdown-it';

// English number to words conversion
export const numberToWords = (num) => {
  const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if (num === 0) return 'zero';

  const isNegative = num < 0;
  let absNum = Math.abs(num);

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

    for (let i = 0; i < decimalPart.length; i++) {
      result += ' ' + numberToWords(parseInt(decimalPart[i]));
    }

    return isNegative ? 'minus ' + result : result;
  }

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
  return num.toString();
};

// Bengali number to words conversion
const convertEnglishNumberToBanglaWords = (num) => {
  const units = ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'];
  const teens = ['দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ'];
  const tens = ['', 'দশ', 'বিশ', 'ত্রিশ', 'চল্লিশ', 'পঞ্চাশ', 'ষাট', 'সত্তর', 'আশি', 'নব্বই'];
  const hundreds = ['', 'এক শত', 'দুই শত', 'তিন শত', 'চার শত', 'পাঁচ শত', 'ছয় শত', 'সাত শত', 'আট শত', 'নয় শত'];

  if (num === 0) return 'শূন্য';

  const isNegative = num < 0;
  let absNum = Math.abs(num);

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

    for (let i = 0; i < decimalPart.length; i++) {
      result += ' ' + convertEnglishNumberToBanglaWords(parseInt(decimalPart[i]));
    }

    return isNegative ? 'মাইনাস ' + result : result;
  }

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
  
  return num.toString();
};

// English math symbols
const mathSymbols = {
  '\\+': 'plus',
  '-': 'minus',
  '\\*': 'times',
  '/': 'divided by',
  '=': 'equals',
  '\\^': 'to the power of',
  '√': 'square root of',
  '≤': 'less than or equal to',
  '≥': 'greater than or equal to',
  '≠': 'not equal to',
  '∈': 'is an element of',
  'ℝ': 'real numbers',
  '\\{': 'the set',
  '\\}': 'end set',
  '\\$': '',
  '\\|': '',
  ':-+': '',
  '-{2,}': '',
  '\\.\\.\\.': 'and so on',
  '\\times': 'times',
  '\\frac': '',
};

// Bengali math symbols
const banglaMathSymbols = {
  '+': 'যোগ',
  '\\+': 'যোগ',
  '-': 'বিয়োগ',
  '×': 'গুণ',
  '\\*': 'গুণ',
  '÷': 'ভাগ',
  '/': 'ভাগ',
  '=': 'সমান',
  '>': 'বড়',
  '<': 'ছোট',
  '≥': 'বড় বা সমান',
  '≤': 'ছোট বা সমান',
  '≠': 'সমান নয়',
  '√': 'বর্গমূল',
  '%': 'শতাংশ',
  '\\^': 'এর ঘাত',
  '∈': 'এর উপাদান',
  '\\{': 'সেট',
  '\\}': 'সেট শেষ',
  '\\$': '',
  '\\|': '',
  ':-+': '',
  '-{2,}': '',
  '\\.\\.\\.': 'ইত্যাদি',
  '\\times': 'গুণ',
  '\\frac': '',
};

// Clean text from unwanted punctuation sounds
const cleanPunctuation = (text, language = 'en-US') => {
  let cleaned = text;
  
  const punctuationRules = {
    '\\*+': '',
    '([a-zA-Z]+)-([a-zA-Z]+)': '$1$2',
    '--+': ' ',
    '^\\s*[•·▪▫‣⁃]\\s*': '',
    '^\\s*[-*+]\\s+': '',
    '\\(([^)]+)\\)': ', $1,',
    '\\.{3,}': ' and so on',
    '_+': ' ',
    '\\s{2,}': ' ',
    ',\\s*,': ',',
    '\\.\\s*\\.': '.',
    '#+': '',
    '@': '',
    '%': ' percent',
    '`+': '',
    '~+': '',
    // Clean LaTeX \text{content}
    '\\\\text\\{([^}]+)\\}': '$1',
  };
  
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  
  Object.keys(punctuationRules).forEach(pattern => {
    const regex = new RegExp(pattern, 'g');
    cleaned = cleaned.replace(regex, punctuationRules[pattern]);
  });
  
  if (language === 'bn-BD') {
    cleaned = cleaned.replace(/[•·▪▫‣⁃]/g, '');
    cleaned = cleaned.replace(/\*+/g, '');
    cleaned = cleaned.replace(/_{2,}/g, ' ');
    cleaned = cleaned.replace(/#+/g, '');
    cleaned = cleaned.replace(/@/g, '');
    cleaned = cleaned.replace(/%/, ' শতাংশ');
    cleaned = cleaned.replace(/`+/g, '');
    cleaned = cleaned.replace(/~+/g, '');
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    cleaned = cleaned.replace(/\\text\{([^}]+)\}/g, '$1');
  }
  
  return cleaned.trim();
};

const processMathExpression = (expr, language = 'en-US') => {
  const isEnglish = language === 'en-US';
  const symbols = isEnglish ? mathSymbols : banglaMathSymbols;

  // // Handle single-letter variables (e.g., x, y, z)
  // if (!isEnglish) {
  //   expr = expr.replace(/(^|\s)([xyz])(\s|$)/gi, '$1এক্স$3');
  //   expr = expr.replace(/(^|\s)([abc])(\s|$)/gi, '$1$2$3');
  // }

  // // Handle LaTeX fractions (e.g., \frac{1}{2})
  // expr = expr.replace(/\\frac\{(\d+)\}\{(\d+)\}/g, (match, num, denom) => {
  //   if (isEnglish) {
  //     return `${numberToWords(parseInt(num))} divided by ${numberToWords(parseInt(denom))}`;
  //   } else {
  //     return `${convertEnglishNumberToBanglaWords(parseInt(num))} দ্বারা ${convertEnglishNumberToBanglaWords(parseInt(denom))}`;
  //   }
  // });

  // // Handle simple fractions (e.g., 1/2)
  // expr = expr.replace(/(\d+)\/(\d+)/g, (match, num, denom) => {
  //   if (isEnglish) {
  //     return `${numberToWords(parseInt(num))} divided by ${numberToWords(parseInt(denom))}`;
  //   } else {
  //     return `${convertEnglishNumberToBanglaWords(parseInt(num))} দ্বারা ${convertEnglishNumberToBanglaWords(parseInt(denom))}`;
  //   }
  // });

  if (isEnglish) {
    expr = expr.replace(/\$([a-zA-Z])\^2\$/g, '$1 squared');
    expr = expr.replace(/\$([a-zA-Z])\^3\$/g, '$1 cubed');
    expr = expr.replace(/\$([a-zA-Z])\^(\d+)\$/g, (match, varName, exp) => {
      if (exp === '2') return `${varName} squared`;
      if (exp === '3') return `${varName} cubed`;
      return `${varName} to the power of ${numberToWords(parseInt(exp))}`;
    });

    expr = expr.replace(/([a-zA-Z])\^2/g, '$1 squared');
    expr = expr.replace(/([a-zA-Z])\^3/g, '$1 cubed');
    expr = expr.replace(/([a-zA-Z])\^(\d+)/g, (match, varName, exp) => {
      if (exp === '2') return `${varName} squared`;
      if (exp === '3') return `${varName} cubed`;
      return `${varName} to the power of ${numberToWords(parseInt(exp))}`;
    });
  } else {
    expr = expr.replace(/\$([a-zA-Z])\^2\$/g, '$1 এর বর্গ');
    expr = expr.replace(/\$([a-zA-Z])\^3\$/g, '$1 এর ঘন');
    expr = expr.replace(/\$([a-zA-Z])\^(\d+)\$/g, (match, varName, exp) => {
      if (exp === '2') return `${varName} এর বর্গ`;
      if (exp === '3') return `${varName} এর ঘন`;
      return `${varName} এর ঘাত ${convertEnglishNumberToBanglaWords(parseInt(exp))}`;
    });

    expr = expr.replace(/([a-zA-Z])\^2/g, '$1 এর বর্গ');
    expr = expr.replace(/([a-zA-Z])\^3/g, '$1 এর ঘন');
    expr = expr.replace(/([a-zA-Z])\^(\d+)/g, (match, varName, exp) => {
      if (exp === '2') return `${varName} এর বর্গ`;
      if (exp === '3') return `${varName} এর ঘন`;
      return `${varName} এর ঘাত ${convertEnglishNumberToBanglaWords(parseInt(exp))}`;
    });
  }

  expr = expr.replace(/\$/g, '');

  if (isEnglish) {
    expr = expr.replace(/(\d+)\s*≤\s*([a-zA-Z])\s*≤\s*(\d+)/g, '$1 and $3 inclusive');
    expr = expr.replace(/\{([^:]+):([^}]+)\}/g, 'the set $1 such that $2');
  } else {
    expr = expr.replace(/(\d+)\s*≤\s*([a-zA-Z])\s*≤\s*(\d+)/g, '$1 থেকে $3 পর্যন্ত');
    expr = expr.replace(/\{([^:]+):([^}]+)\}/g, 'সেট $1 যেখানে $2');
  }

  // Explicitly handle \times and × for Bengali
  if (!isEnglish) {
    expr = expr.replace(/\\times/g, ' গুণ ');
    expr = expr.replace(/×/g, ' গুণ ');
  }

  Object.keys(symbols).forEach((symbol) => {
    if (symbol === '-' && isEnglish) {
      expr = expr.replace(/(\d+)\s*-\s*(\d+)/g, '$1 minus $2');
      expr = expr.replace(/([=<>])\s*-\s*(\d+)/g, '$1 minus $2');
    } else if (symbol === '\\+') {
      expr = expr.replace(/(\d+)\s*\+\s*(\d+)/g, '$1 plus $2');
    } else if (symbol !== '-') {
      const escapedSymbol = symbol.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      expr = expr.replace(new RegExp(escapedSymbol, 'g'), ` ${symbols[symbol]} `);
    }
  });

  expr = expr.replace(/(^|\s):(\s|$)/g, '$1, $2');

  return expr.replace(/\s+/g, ' ').trim();
};

// Enhanced Bengali text preprocessing
const preprocessBanglaText = (text) => {
  let processed = text;
  
  processed = cleanPunctuation(processed, 'bn-BD');
  
  const banglaNumbers = {
    '০': 'শূন্য', '১': 'এক', '২': 'দুই', '৩': 'তিন', '৪': 'চার',
    '৫': 'পাঁচ', '৬': 'ছয়', '৭': 'সাত', '৮': 'আট', '৯': 'নয়'
  };
  
  Object.keys(banglaNumbers).forEach(num => {
    processed = processed.replace(new RegExp(num, 'g'), banglaNumbers[num]);
  });
  
  processed = processed.replace(/\b(-?\d+\.?\d*)\b/g, (match) => {
    const num = parseFloat(match);
    return Number.isInteger(num) ? convertEnglishNumberToBanglaWords(num) : convertEnglishNumberToBanglaWords(num);
  });
  
  processed = processed.replace(/(^|\s)([xyz])(\s|$)/gi, '$1এক্স$3');
  processed = processed.replace(/(^|\s)([abc])(\s|$)/gi, '$1$2$3');

  processed = processMarkdown(processed, 'bn-BD');
  
  processed = processMathExpression(processed, 'bn-BD');
  
  processed = processed.replace(/\{([^}]+)\}/g, (match, content) => {
    return `সেট ${processMathExpression(content, 'bn-BD')}`;
  });
  
  return processed.replace(/\s+/g, ' ').trim();
};

const md = new MarkdownIt();

const processMarkdown = (text, language = 'en-US') => {
  const isEnglish = language === 'en-US';
  
  const numberPlaceholder = 'NUMBER_PROTECTED_';
  let numberMap = new Map();
  let numberCounter = 0;
  text = text.replace(/\b(-?\d+\.?\d*)\b/g, (match) => {
    const placeholder = `${numberPlaceholder}${numberCounter++}`;
    numberMap.set(placeholder, match);
    return placeholder;
  });
  
  const tableRegex = /\|\s*(.+?)\s*\|\s*\n\|\s*[-:]+\s*\|\s*[-:]+\s*\|\s*[-:]+\s*\|\s*[-:]+\s*\|\s*\n((?:\|\s*.+?\s*\|\s*\n)+)/g;
  const rowRegex = /\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*/;
  
  let processed = text;
  let match;
  
  while ((match = tableRegex.exec(text)) !== null) {
    const headerLine = match[1];
    const rowsContent = match[2];
    
    const headerMatch = rowRegex.exec('|' + headerLine + '|');
    let headers = [];
    if (headerMatch) {
      for (let i = 1; i < headerMatch.length; i++) {
        headers.push(processMathExpression(headerMatch[i].trim(), language));
      }
    }
    
    const rowLines = rowsContent.trim().split('\n');
    let rows = [];
    
    rowLines.forEach(rowLine => {
      const rowMatch = rowRegex.exec(rowLine);
      if (rowMatch) {
        let row = [];
        for (let i = 1; i < rowMatch.length; i++) {
          row.push(processMathExpression(rowLine[i].trim(), language));
        }
        rows.push(row);
      }
    });
    
    const tableTitle = text.match(/\*\*([^*]+)\*\*/)?.[1] || (isEnglish ? "Summary Table" : "সারণী");
    let tableOutput = isEnglish 
      ? `Table titled "${processMathExpression(tableTitle, language)}". Columns are: ${headers.join(', ')}. `
      : `সারণী "${processMathExpression(tableTitle, language)}"। কলাম সমূহ: ${headers.join(', ')}। `;
    
    rows.forEach((row, index) => {
      tableOutput += isEnglish ? `Row ${index + 1}: ` : `সারি ${convertEnglishNumberToBanglaWords(index + 1)}: `;
      row.forEach((cell, i) => {
        if (i < headers.length) {
          tableOutput += isEnglish 
            ? `${headers[i]} is ${cell}`
            : `${headers[i]} হলো ${cell}`;
          if (i < row.length - 1) {
            tableOutput += isEnglish ? '; ' : '; ';
          }
        }
      });
      tableOutput += '। ';
    });
    
    processed = processed.replace(match[0], tableOutput);
  }
  
  const tokens = md.parse(processed, {});
  let output = '';
  let inTable = false;
  
  for (const token of tokens) {
    if (token.type === 'table_open') {
      inTable = true;
    } else if (token.type === 'table_close') {
      inTable = false;
    } else if (token.type === 'inline' && !inTable) {
      let content = token.content;
      content = content.replace(/^\*\s+/gm, ', ');
      content = processMathExpression(content, language);
      output += content + ' ';
    }
  }
  
  numberMap.forEach((value, placeholder) => {
    output = output.replace(placeholder, isEnglish ? numberToWords(parseFloat(value)) : convertEnglishNumberToBanglaWords(parseFloat(value)));
  });
  
  return output.trim();
};

// Enhanced language detection
export const detectLanguage = (text) => {
  const banglaRegex = /[\u0980-\u09FF]/;
  const banglaWords = /(এক|দুই|তিন|চার|পাঁচ|ছয়|সাত|আট|নয়|দশ|গণিত|বিজ্ঞান|ইতিহাস|বাংলা|অধ্যায়|পাঠ|সমস্যা|সমাধান|উত্তর|প্রশ্ন)/;
  const banglaCommonWords = /(হলো|হবে|আছে|করে|করা|এর|তার|সেই|এই|যে|কি|কেন|কিভাবে|যেমন|তেমন|অথবা|এবং|কিন্তু|তবে|যদি|তাহলে)/;
  
  return (banglaRegex.test(text) || banglaWords.test(text) || banglaCommonWords.test(text)) ? 'bn-BD' : 'en-US';
};

// Main preprocessing function
export const preprocessText = (text) => {
  const language = detectLanguage(text);
  
  if (language === 'bn-BD') {
    return preprocessBanglaText(text);
  } else {
    let processed = text;
    
    processed = cleanPunctuation(processed, language);
    
    processed = processMarkdown(processed, language);

    processed = processed.replace(/\b(-?\d+\.?\d*)\b/g, (match) => {
      return numberToWords(parseFloat(match));
    });

    const isTeachingContext = /(variable|constant)\s+[a-z]/i.test(processed);
    if (!isTeachingContext) {
      processed = processed.replace(/(^|\s)([xyz])(\s|$)/gi, '$1$2$3');
      processed = processed.replace(/(^|\s)([abc])(\s|$)/gi, '$1$2$3');
    }

    processed = processed.replace(/\{([^}]+)\}/g, (match, content) => {
      return `the set ${processMathExpression(content, language)}`;
    });

    return processed.replace(/\s+/g, ' ').trim();
  }
};
