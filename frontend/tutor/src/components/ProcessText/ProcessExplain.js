export const processExplanation = (text) => {
   let processed = text;
   console.log(processed);
//      processed= String.raw`


//     *   $\frac{a+b}{b} \times \frac{b}{a-b} = \frac{a+b}{a-b}$
//     *   $\frac{c+d}{d} \times \frac{d}{c-d} = \frac{c+d}{c-d}$
// `;
//     *   বাম পাশে: $\frac{a+b}{b} \times \frac{b}{a-b} = \frac{a+b}{a-b}$
//     *   ডান পাশে: $\frac{c+d}{d} \times \frac{d}{c-d} = \frac{c+d}{c-d}$



    // console.log(processed);
    return processed;
  };


export const preprocessMath = (text) => {
  // Replace | with placeholder inside $...$ and $$...$$ expressions
//   return text.replace(/(\$\$?[^$]*\$\$?)/g, (match) => {
//     return match.replace(/\|/g, '{{PIPE}}');
//   });
// };
return text
}

export const postprocessMath = (text) => {
  // Restore | symbols back for KaTeX
  // return text.replace(/\{\{PIPE\}\}/g, '|');
  return text 
};