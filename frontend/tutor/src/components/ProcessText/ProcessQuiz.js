// ProcessQuiz.js - Mathematical text processor for quiz questions
export const processQuizText = (text) => {
  if (!text) return "";
  
  let processed = String(text);
  
  // Convert subscripts a_1 → a₁ using Unicode
  processed = processed.replace(/([a-zA-Z])_(\d+)/g, (match, letter, number) => {
    const subscriptMap = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉'};
    const subscript = number.split('').map(d => subscriptMap[d]).join('');
    return letter + subscript;
  });
  
  // Convert simple fractions to KaTeX format for better display
  processed = processed.replace(/([a-zA-Z₀-₉]+)\/([a-zA-Z₀-₉]+)/g, (match, num, den) => {
    // Convert back subscripts for KaTeX
    const katexNum = num.replace(/([a-zA-Z])[₀-₉]/g, (m, letter) => {
      const subMap = {'₀':'_0','₁':'_1','₂':'_2','₃':'_3','₄':'_4','₅':'_5','₆':'_6','₇':'_7','₈':'_8','₉':'_9'};
      const subscript = m.slice(1).split('').map(s => subMap[s] || s).join('');
      return letter + subscript;
    });
    const katexDen = den.replace(/([a-zA-Z])[₀-₉]/g, (m, letter) => {
      const subMap = {'₀':'_0','₁':'_1','₂':'_2','₃':'_3','₄':'_4','₅':'_5','₆':'_7','₈':'_8','₉':'_9'};
      const subscript = m.slice(1).split('').map(s => subMap[s] || s).join('');
      return letter + subscript;
    });
    return `$\\frac{${katexNum}}{${katexDen}}$`;
  });
  
  // Wrap equations in KaTeX delimiters
  processed = processed.replace(/(\d*[a-zA-Z₀-₉]\s*[+\-]\s*\d*[a-zA-Z₀-₉]\s*=\s*\d+)/g, '$$$1$$');
  
  return processed;
};