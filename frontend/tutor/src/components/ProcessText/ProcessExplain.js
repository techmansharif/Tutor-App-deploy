export const processExplanation = (text) => {
   let processed = text;
   console.log(processed);
//      processed= String.raw`|সূত্র | উদাহরণ | ফলাফল |
// |:------|:------:|-------:|
// | বর্গ | $x^2$ যখন $x=5$ | $25$ |
// | বর্গমূল | $\sqrt{16}$ | $4$ |
// | ভগ্নাংশ | $\frac{10}{2}$ | $5$ |
// `;


    // Split long math expressions containing multiple \text{|} or \cancel{\text{|}} parts
   processed = processed.replace(/\$([^$]*)\$/g, (match, mathContent) => {
     // Find all \text{|+} and \cancel{\text{|+}} patterns
     const patterns = mathContent.match(/\\cancel\{\\text\{\|+\}\}|\\text\{\|+\}/g);
     
     if (patterns && patterns.length > 1) {
       // Split into separate math expressions
       return patterns.map(pattern => `$${pattern}$`).join(' ');
     }
     
     // Return original if no splitting needed
     return match;
   });   // Split long math expressions containing multiple \text{|} or \cancel{\text{|}} parts
   processed = processed.replace(/\$([^$]*)\$/g, (match, mathContent) => {
     // Find all \text{|+} and \cancel{\text{|+}} patterns
     const patterns = mathContent.match(/\\cancel\{\\text\{\|+\}\}|\\text\{\|+\}/g);
     
     if (patterns && patterns.length > 1) {
       // Split into separate math expressions
       return patterns.map(pattern => `$${pattern}$`).join(' ');
     }
     
     // Return original if no splitting needed
     return match;
   });


    // console.log(processed);
    return processed;
  };


export const preprocessMath = (text) => {
  // Replace | with placeholder inside $...$ and $$...$$ expressions
  return text.replace(/(\$\$?[^$]*\$\$?)/g, (match) => {
    return match.replace(/\|/g, '{{PIPE}}');
  });
};

export const postprocessMath = (text) => {
  // Restore | symbols back for KaTeX
  return text.replace(/\{\{PIPE\}\}/g, '|');
};