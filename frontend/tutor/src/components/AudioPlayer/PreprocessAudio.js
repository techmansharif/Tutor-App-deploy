import MarkdownIt from 'markdown-it';

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
  '\\|': '', // Ignore table pipes
  ':-+': '', // Ignore table alignment
  '-{2,}': '', // Ignore multiple dashes
  '\\.\\.\\.': 'and so on',
};

const processMathExpression = (expr) => {
  // Handle LaTeX superscripts
  expr = expr.replace(/\$([a-zA-Z])\^2\$/g, '$1 squared');
  expr = expr.replace(/\$([a-zA-Z])\^3\$/g, '$1 cubed');
  expr = expr.replace(/\$([a-zA-Z])\^(\d+)\$/g, (match, varName, exp) => {
    if (exp === '2') return `${varName} squared`;
    if (exp === '3') return `${varName} cubed`;
    return `${varName} to the power of ${numberToWords(parseInt(exp))}`;
  });

  // Handle non-LaTeX superscripts
  expr = expr.replace(/([a-zA-Z])\^2/g, '$1 squared');
  expr = expr.replace(/([a-zA-Z])\^3/g, '$1 cubed');
  expr = expr.replace(/([a-zA-Z])\^(\d+)/g, (match, varName, exp) => {
    if (exp === '2') return `${varName} squared`;
    if (exp === '3') return `${varName} cubed`;
    return `${varName} to the power of ${numberToWords(parseInt(exp))}`;
  });

  // Remove LaTeX markers
  expr = expr.replace(/\$/g, '');

  // Handle range notation
  expr = expr.replace(/(\d+)\s*≤\s*([a-zA-Z])\s*≤\s*(\d+)/g, '$1 and $3 inclusive');

  // Handle set notation
  expr = expr.replace(/\{([^:]+):([^}]+)\}/g, 'the set $1 such that $2');

  // Replace math symbols
  Object.keys(mathSymbols).forEach((symbol) => {
    const escapedSymbol = symbol.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    expr = expr.replace(new RegExp(escapedSymbol, 'g'), ` ${mathSymbols[symbol]} `);
  });

  // Handle standalone colons
  expr = expr.replace(/(^|\s):(\s|$)/g, '$1, $2');

  return expr.replace(/\s+/g, ' ').trim();
};

const md = new MarkdownIt();

const processMarkdown = (text) => {
  // First, let's parse the text directly to detect tables
  const tableRegex = /\|\s*(.+?)\s*\|\s*\n\|\s*[-:]+\s*\|\s*[-:]+\s*\|\s*[-:]+\s*\|\s*[-:]+\s*\|\s*\n((?:\|\s*.+?\s*\|\s*\n)+)/g;
  const rowRegex = /\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*/;
  
  let processed = text;
  let match;
  
  // Process tables manually
  while ((match = tableRegex.exec(text)) !== null) {
    const headerLine = match[1];
    const rowsContent = match[2];
    
    // Parse headers
    const headerMatch = rowRegex.exec('|' + headerLine + '|');
    let headers = [];
    if (headerMatch) {
      // Skip the first item as it's the full match
      for (let i = 1; i < headerMatch.length; i++) {
        headers.push(processMathExpression(headerMatch[i].trim()));
      }
    }
    
    // Parse rows
    const rowLines = rowsContent.trim().split('\n');
    let rows = [];
    
    rowLines.forEach(rowLine => {
      const rowMatch = rowRegex.exec(rowLine);
      if (rowMatch) {
        let row = [];
        // Skip the first item as it's the full match
        for (let i = 1; i < rowMatch.length; i++) {
          row.push(processMathExpression(rowMatch[i].trim()));
        }
        rows.push(row);
      }
    });
    
    // Create speech-friendly table output
    let tableOutput = `Table titled "${processMathExpression(text.match(/\*\*([^*]+)\*\*/)?.[1] || "Summary Table")}". `;
    tableOutput += `Columns are: ${headers.join(', ')}. `;
    
    // Process each row
    rows.forEach((row, index) => {
      tableOutput += `Row ${index + 1}: `;
      row.forEach((cell, i) => {
        // Use the header as a label for each cell value
        if (i < headers.length) {
          tableOutput += `${headers[i]} is ${cell}`;
          // Add proper separation between cells
          if (i < row.length - 1) {
            tableOutput += '; ';
          }
        }
      });
      tableOutput += '. ';
    });
    
    // Replace the table in the original text with our processed version
    processed = processed.replace(match[0], tableOutput);
  }
  
  // Now continue with the regular markdown parser for non-table content
  const tokens = md.parse(processed, {});
  let output = '';

  let inTable = false;
  
  for (const token of tokens) {
    if (token.type === 'table_open') {
      inTable = true;
    } else if (token.type === 'table_close') {
      inTable = false;
    } else if (token.type === 'inline' && !inTable) {
      // Handle non-table content (e.g., bullet points, text)
      let content = token.content;
      // Process bullet points
      content = content.replace(/^\*\s+/gm, ', ');
      // Process math expressions
      content = processMathExpression(content);
      output += content + ' ';
    }
  }

  // Make sure we return the output
  return output.trim();
};

export const preprocessText = (text) => {
  // Process Markdown first
  let processed = processMarkdown(text);

  // Process numbers
  processed = processed.replace(/\b(-?\d+\.?\d*)\b/g, (match) => {
    return numberToWords(parseFloat(match));
  });

  // Handle variables/constants
  const isTeachingContext = /(variable|constant)\s+[a-z]/i.test(processed);
  if (!isTeachingContext) {
    processed = processed.replace(/(^|\s)([xyz])(\s|$)/gi, '$1$2$3');
    processed = processed.replace(/(^|\s)([abc])(\s|$)/gi, '$1$2$3');
  }

  // Handle set notation
  processed = processed.replace(/\{([^}]+)\}/g, (match, content) => {
    return `the set ${processMathExpression(content)}`;
  });

  return processed.replace(/\s+/g, ' ').trim();
};

export const detectLanguage = (text) => {
  const banglaRegex = /[\u0980-\u09FF]/;
  return banglaRegex.test(text) ? 'bn-BD' : 'en-US';
};