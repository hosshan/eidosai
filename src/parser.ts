import { Command } from './types';

export function parseCommand(text: string): Command | null {
  // Match @eidosai command
  const genVisualMatch = text.match(/@eidosai\s+(.+)/i);
  
  if (!genVisualMatch) {
    return null;
  }

  let rest = genVisualMatch[1].trim();
  
  // Extract count from --count or -c option
  let count: number | undefined;
  const countMatch = rest.match(/(?:--count|-c)\s+(\d+)/i);
  if (countMatch) {
    count = parseInt(countMatch[1], 10);
    // Remove count option from rest for further parsing
    rest = rest.replace(/(?:--count|-c)\s+\d+/i, '').trim();
  }
  
  // Extract --no-issue-body option
  let excludeIssueBody = false;
  if (rest.match(/--no-issue-body/i)) {
    excludeIssueBody = true;
    // Remove option from rest for further parsing
    rest = rest.replace(/--no-issue-body/gi, '').trim();
  }
  
  // Check for existing types (wf, concept, or modify)
  const existingTypeMatch = rest.match(/^(wf|concept|modify)$/i);
  if (existingTypeMatch) {
    const commandType = existingTypeMatch[1].toLowerCase() as 'wf' | 'concept' | 'modify';
    
    return {
      type: commandType,
      rawText: text,
      count: count,
      excludeIssueBody: excludeIssueBody
    };
  }
  
  // Check for custom type with explicit "custom" keyword
  // Format: @eidosai custom "description" [--count N]
  const customExplicitMatch = rest.match(/^custom\s+(?:"([^"]+)"|'([^']+)'|([^\s]+(?:\s+[^\s]+)*?))$/i);
  if (customExplicitMatch) {
    const customPrompt = customExplicitMatch[1] || customExplicitMatch[2] || customExplicitMatch[3];
    
    return {
      type: 'custom',
      rawText: text,
      customPrompt: customPrompt,
      count: count,
      excludeIssueBody: excludeIssueBody
    };
  }
  
  // Check for custom type without explicit keyword
  // Format: @eidosai "description" [--count N] or @eidosai description [--count N]
  const customImplicitMatch = rest.match(/^(?:"([^"]+)"|'([^']+)'|([^\s]+(?:\s+[^\s]+)*?))$/i);
  if (customImplicitMatch) {
    const customPrompt = customImplicitMatch[1] || customImplicitMatch[2] || customImplicitMatch[3];
    
    // If the prompt is just a number, it's not a custom command
    if (!isNaN(parseInt(customPrompt, 10)) && !customImplicitMatch[1] && !customImplicitMatch[2]) {
      return null;
    }
    
    return {
      type: 'custom',
      rawText: text,
      customPrompt: customPrompt,
      count: count,
      excludeIssueBody: excludeIssueBody
    };
  }
  
  return null;
}

export function extractContext(issueBody: string, commentBody: string): string {
  // Combine issue body and comment for AI context
  const context = `
# Issue Description
${issueBody}

# User Request
${commentBody}
`;
  return context.trim();
}
