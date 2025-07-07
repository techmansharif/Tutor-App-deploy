// preprocessAudio.js - Smart LaTeX cleanup for TTS

/**
 * Main preprocessing function for TTS
 * Cleans LaTeX, markdown, and other formatting
 */
export const preprocessForTTS = (text, language = 'auto') => {
  if (!text) return '';
  
  let cleanText = text;
  
  // Detect language if auto
  const detectedLang = language === 'auto' ? detectLanguage(cleanText) : language;
  
  // Apply preprocessing steps
  cleanText = removeMathDelimiters(cleanText);
  cleanText = convertLatexSymbols(cleanText, detectedLang);
  cleanText = removeLatexCommands(cleanText);
  cleanText = convertMarkdownFormatting(cleanText);
  cleanText = cleanSpecialCharacters(cleanText);
  cleanText = normalizeWhitespace(cleanText);
  
  return cleanText;
};

/**
 * Detect if text is primarily Bengali or English
 */
const detectLanguage = (text) => {
  const bengaliRegex = /[\u0980-\u09FF]/g;
  const bengaliMatches = text.match(bengaliRegex) || [];
  const totalChars = text.replace(/\s/g, '').length;
  
  return bengaliMatches.length / totalChars > 0.3 ? 'bn' : 'en';
};

/**
 * Remove math delimiters ($...$, $$...$$, \[...\], etc.)
 */
const removeMathDelimiters = (text) => {
  return text
    // Remove display math $$...$$
    .replace(/\$\$([^$]+)\$\$/g, '$1')
    // Remove inline math $...$
    .replace(/\$([^$]+)\$/g, '$1')
    // Remove \[...\] display math
    .replace(/\\\[([^\]]+)\\\]/g, '$1')
    // Remove \(...\) inline math
    .replace(/\\\(([^)]+)\\\)/g, '$1');
};

/**
 * Convert LaTeX symbols to readable text
 */
const convertLatexSymbols = (text, language) => {
  const symbolMap = getSymbolMap(language);
  
  let result = text;
  
  // Replace symbols in order of specificity (longer patterns first)
  const sortedSymbols = Object.keys(symbolMap).sort((a, b) => b.length - a.length);
  
  for (const symbol of sortedSymbols) {
    const replacement = symbolMap[symbol];
    // Use word boundaries to avoid partial replacements
    const regex = new RegExp('\\b' + escapeRegex(symbol) + '\\b', 'g');
    result = result.replace(regex, replacement);
  }
  
  return result;
};

/**
 * Get symbol replacement map based on language
 */
const getSymbolMap = (language) => {
  const commonSymbols = {
    // Mathematical operators
    '\\times': language === 'bn' ? ' গুণ ' : ' times ',
    '\\div': language === 'bn' ? ' ভাগ ' : ' divided by ',
    '\\pm': language === 'bn' ? ' প্লাস মাইনাস ' : ' plus minus ',
    '\\mp': language === 'bn' ? ' মাইনাস প্লাস ' : ' minus plus ',
    
    // Set theory
    '\\in': language === 'bn' ? ' এর সদস্য ' : ' belongs to ',
    '\\notin': language === 'bn' ? ' এর সদস্য নয় ' : ' does not belong to ',
    '\\subset': language === 'bn' ? ' এর উপসেট ' : ' is a subset of ',
    '\\subseteq': language === 'bn' ? ' এর উপসেট বা সমান ' : ' is a subset of or equal to ',
    '\\supset': language === 'bn' ? ' এর সুপারসেট ' : ' is a superset of ',
    '\\supseteq': language === 'bn' ? ' এর সুপারসেট বা সমান ' : ' is a superset of or equal to ',
    '\\cup': language === 'bn' ? ' ইউনিয়ন ' : ' union ',
    '\\cap': language === 'bn' ? ' ইন্টারসেকশন ' : ' intersection ',
    '\\emptyset': language === 'bn' ? ' খালি সেট ' : ' empty set ',
    
    // Relations
    '\\leq': language === 'bn' ? ' ছোট বা সমান ' : ' less than or equal to ',
    '\\geq': language === 'bn' ? ' বড় বা সমান ' : ' greater than or equal to ',
    '\\neq': language === 'bn' ? ' সমান নয় ' : ' not equal to ',
    '\\approx': language === 'bn' ? ' প্রায় সমান ' : ' approximately equal to ',
    '\\equiv': language === 'bn' ? ' অভিন্ন ' : ' equivalent to ',
    
    // Greek letters
    '\\alpha': language === 'bn' ? ' আলফা ' : ' alpha ',
    '\\beta': language === 'bn' ? ' বিটা ' : ' beta ',
    '\\gamma': language === 'bn' ? ' গামা ' : ' gamma ',
    '\\delta': language === 'bn' ? ' ডেল্টা ' : ' delta ',
    '\\theta': language === 'bn' ? ' থিটা ' : ' theta ',
    '\\pi': language === 'bn' ? ' পাই ' : ' pi ',
    '\\sigma': language === 'bn' ? ' সিগমা ' : ' sigma ',
    
    // Functions
    '\\sin': language === 'bn' ? ' সাইন ' : ' sine ',
    '\\cos': language === 'bn' ? ' কসাইন ' : ' cosine ',
    '\\tan': language === 'bn' ? ' ট্যানজেন্ট ' : ' tangent ',
    '\\log': language === 'bn' ? ' লগ ' : ' log ',
    '\\ln': language === 'bn' ? ' প্রাকৃতিক লগ ' : ' natural log ',
    
    // Arrows
    '\\rightarrow': language === 'bn' ? ' থেকে ' : ' maps to ',
    '\\leftarrow': language === 'bn' ? ' থেকে আসে ' : ' comes from ',
    '\\leftrightarrow': language === 'bn' ? ' দ্বিমুখী ' : ' if and only if ',
    
    // Common symbols that TTS reads badly
    '\\cdot': language === 'bn' ? ' ডট ' : ' dot ',
    '\\circ': language === 'bn' ? ' কম্পোজিশন ' : ' composition ',
    '\\star': language === 'bn' ? ' স্টার ' : ' star ',
    '\\ast': language === 'bn' ? ' অ্যাস্টেরিস্ক ' : ' asterisk '
  };
  
  return commonSymbols;
};

/**
 * Remove LaTeX commands and clean up formatting
 */
const removeLatexCommands = (text) => {
  return text
    // Remove \text{...} commands but keep content
    .replace(/\\text\{([^}]+)\}/g, '$1')
    // Remove \mathrm{...} commands but keep content
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    // Remove \mathbf{...} commands but keep content
    .replace(/\\mathbf\{([^}]+)\}/g, '$1')
    // Remove \emph{...} commands but keep content
    .replace(/\\emph\{([^}]+)\}/g, '$1')
    // Remove \textbf{...} commands but keep content
    .replace(/\\textbf\{([^}]+)\}/g, '$1')
    // Remove \textit{...} commands but keep content
    .replace(/\\textit\{([^}]+)\}/g, '$1')
    // Remove \underline{...} commands but keep content
    .replace(/\\underline\{([^}]+)\}/g, '$1')
    // Remove other common commands
    .replace(/\\[a-zA-Z]+\*/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    // Remove remaining curly braces that might be left
    .replace(/[{}]/g, '');
};

/**
 * Convert markdown formatting to readable text
 */
const convertMarkdownFormatting = (text) => {
  return text
    // Remove bold/italic markdown
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove headers
    .replace(/^#+\s*/gm, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove horizontal rules
    .replace(/^---+$/gm, '');
};

/**
 * Clean special characters that TTS reads poorly
 */
const cleanSpecialCharacters = (text) => {
  return text
    // Replace multiple dashes with pause
    .replace(/--+/g, ', ')
    // Remove or replace special characters
    .replace(/[|]/g, ' ')
    // .replace(/[<>]/g, '')
    .replace(/[@#%^&]/g, '')
    // Fix common issues
    .replace(/\s*:\s*/g, ': ')
    .replace(/\s*;\s*/g, '; ')
    .replace(/\s*,\s*/g, ', ');
};

/**
 * Normalize whitespace
 */
const normalizeWhitespace = (text) => {
  return text
    .replace(/\s+/g, ' ')           // Multiple spaces to single space
    .replace(/\n\s*\n/g, '\n\n')    // Normalize paragraph breaks
    .replace(/^\s+|\s+$/g, '')      // Trim start and end
    .trim();
};

/**
 * Escape special regex characters
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Advanced preprocessing for specific content types
 */
export const preprocessMathContent = (text, language = 'auto') => {
  // Specialized for mathematical content
  let cleaned = preprocessForTTS(text, language);
  
  // Additional math-specific cleaning
  cleaned = cleaned
    .replace(/\bR\b/g, language === 'bn' ? ' অন্বয় R ' : ' relation R ')
    .replace(/\bA\b/g, language === 'bn' ? ' সেট A ' : ' set A ')
    .replace(/\bB\b/g, language === 'bn' ? ' সেট B ' : ' set B ')
    // Handle subscripts/superscripts in simple cases
    .replace(/([a-zA-Z])_(\w+)/g, '$1 সাবস্ক্রিপ্ট $2')
    .replace(/([a-zA-Z])\^(\w+)/g, '$1 পাওয়ার $2');
  
  return cleaned;
};

/**
 * Quick test function
 */
export const testPreprocessing = () => {
  const testText = "আচ্ছা, তোমার কি কোনো প্রিয় বন্ধু আছে? $(\text{রহিম}, \text{১৪})$ এই দুটো তথ্যকে যখন আমরা একটা নির্দিষ্ট ক্রমে লিখি। $A \\times B$ এবং $R \\subseteq A \\times B$।";
  
  console.log("Original:", testText);
  console.log("Cleaned:", preprocessForTTS(testText, 'bn'));
};

// Default export
export default {
  preprocessForTTS,
  preprocessMathContent,
  testPreprocessing
};