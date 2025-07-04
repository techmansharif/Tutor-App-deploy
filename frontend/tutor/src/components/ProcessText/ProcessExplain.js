export const processExplanation = (text) => {
   let processed = text;
   console.log(processed);
     processed= String.raw`


    *   $\frac{a+b}{b} \times \frac{b}{a-b} = \frac{a+b}{a-b}$
    *   $\frac{c+d}{d} \times \frac{d}{c-d} = \frac{c+d}{c-d}$


`;

// ৩.  **তৃতীয় ধাপ: ভাগ করা**
//     *   এখন, আমরা সমীকরণ (১) কে সমীকরণ (২) দিয়ে ভাগ করি:
//         $\frac{\frac{a+b}{b}}{\frac{a-b}{b}} = \frac{\frac{c+d}{d}}{\frac{c-d}{d}}$

//     *   বাম পাশে: $\frac{a+b}{b} \times \frac{b}{a-b} = \frac{a+b}{a-b}$
//     *   ডান পাশে: $\frac{c+d}{d} \times \frac{d}{c-d} = \frac{c+d}{c-d}$

// ৪.  **চতুর্থ ধাপ: ফলাফল**
//     *   তাহলে আমরা পেলাম: $\frac{a+b}{a-b} = \frac{c+d}{c-d}$

// **উদাহরণ:**
// ধরো, $\frac{2}{3} = \frac{4}{6}$
// এখানে $a=2, b=3, c=4, d=6$।

// নিয়ম অনুযায়ী:
// $\frac{a+b}{a-b} = \frac{c+d}{c-d}$
// $\frac{2+3}{2-3} = \frac{4+6}{4-6}$
// $\frac{5}{-1} = \frac{10}{-2}$
// $-5 = -5$
// দেখলে তো! দুটোই সমান।

// **কখন কাজে লাগে?**
// এই নিয়মটা গণিতের অনে
  //   // Split long math expressions containing multiple \text{|} or \cancel{\text{|}} parts
  //  processed = processed.replace(/\$([^$]*)\$/g, (match, mathContent) => {
  //    // Find all \text{|+} and \cancel{\text{|+}} patterns
  //    const patterns = mathContent.match(/\\cancel\{\\text\{\|+\}\}|\\text\{\|+\}/g);
     
  //    if (patterns && patterns.length > 1) {
  //      // Split into separate math expressions
  //      return patterns.map(pattern => `$${pattern}$`).join(' ');
  //    }
     
  //    // Return original if no splitting needed
  //    return match;
  //  });   // Split long math expressions containing multiple \text{|} or \cancel{\text{|}} parts
  //  processed = processed.replace(/\$([^$]*)\$/g, (match, mathContent) => {
  //    // Find all \text{|+} and \cancel{\text{|+}} patterns
  //    const patterns = mathContent.match(/\\cancel\{\\text\{\|+\}\}|\\text\{\|+\}/g);
     
  //    if (patterns && patterns.length > 1) {
  //      // Split into separate math expressions
  //      return patterns.map(pattern => `$${pattern}$`).join(' ');
  //    }
     
  //    // Return original if no splitting needed
  //    return match;
  //  });


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