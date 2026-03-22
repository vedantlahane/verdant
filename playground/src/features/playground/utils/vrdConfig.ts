/**
 * Helper to toggle or set a value in the .vrd config block.
 * Uses regex to modify the source string while preserving comments and formatting where possible.
 */
export function toggleVrdConfigLine(code: string, key: string, newValue?: string | boolean): string {
  const configRegex = /config\s*{([^}]*)}/s;
  const configMatch = code.match(configRegex);

  if (!configMatch) {
    // If no config block, add one at the top
    const val = newValue !== undefined ? newValue : "true";
    return `config {\n  ${key}: ${val}\n}\n\n${code}`;
  }

  const blockContent = configMatch[1];
  const keyRegex = new RegExp(`(${key}\\s*:\\s*)([^\\n#]*)`, "i");
  const keyMatch = blockContent.match(keyRegex);

  if (keyMatch) {
    let resolvedValue: string;
    if (newValue !== undefined) {
      resolvedValue = String(newValue);
    } else {
      // Toggle boolean if newValue is undefined
      resolvedValue = keyMatch[2].trim().toLowerCase() === "true" ? "false" : "true";
    }
    
    const newBlock = blockContent.replace(keyRegex, `$1${resolvedValue}`);
    return code.replace(configMatch[0], `config {${newBlock}}`);
  } else {
    // Key not in block, append it
    const val = newValue !== undefined ? newValue : "true";
    const newBlock = blockContent.trimEnd() + `\n  ${key}: ${val}\n`;
    return code.replace(configMatch[0], `config {\n${newBlock}}`);
  }
}
