export const processExplanation = (text) => {
    let processed = text;

    // Handle LaTeX expressions wrapped in backticks and \( \), replacing with dollar signs
    processed = processed.replace(/`\\\((\s*.*?[^\\]\s*)\\\)`/gs, '$$$1$$');

    // Handle LaTeX expressions in \( \) without backticks, replacing with dollar signs
    processed = processed.replace(/\\\((\s*.*?[^\\]\s*)\\\)/gs, '$$$1$$');

    processed = processed.replace(/`(\$+)([^`$]*?)(?=`)/g, (match, p1, p2) => {
      if (!p2.includes('$')) {
        return `\`${p1}${p2}${p1}\``;
      }
      return match;
    });

    processed = processed.replace(/`(\$+)([^$]*?)(\$+)([^`]*?)`/g, (match, p1, p2, p3, p4) => {
      const dollarCount = Math.min(p1.length, p3.length);
      const dollars = '$'.repeat(dollarCount);
      return `\`${dollars}${p2}${dollars}${p4}\``;
    });

    processed = processed.replace(/(['`])\s*(\$+)([^\$]*)\ акции/g, '$2$3$2');

    processed = processed.replace(/`(\$+)([^$]*?)(\$+)([^`]*?)`/g, (match, p1, p2, p3, p4) => {
      return `${p1}${p2}${p3}${p4}`;
    });

    processed = processed.replace(/(\$+)([^$]*?)(\$+)/g, (match, p1, p2, p3) => {
      const dollarCount = Math.min(p1.length, p3.length);
      const dollars = '$'.repeat(dollarCount);
      return `${dollars}${p2}${dollars}`;
    });

    processed = processed.replace(/`([^$\s]*?)`/g, (match, p1) => {
      if (p1.includes('$')) {
        return match;
      }
      return p1;
    });

    const lines = processed.split('\n');
    processed = lines
      .map((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('*')) {
          const indent = line.match(/^\s*/)[0];
          return `${indent}* ${trimmedLine.slice(1).trim()}`;
        }
        return line;
      })
      .join('\n');

    console.log(processed);
    return processed;
  };