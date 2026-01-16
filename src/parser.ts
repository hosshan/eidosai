import { Command } from './types';

export function parseCommand(text: string): Command | null {
  // Match @gen-visual followed by command (wf or concept)
  const match = text.match(/@gen-visual\s+(wf|concept)/i);
  
  if (!match) {
    return null;
  }

  const commandType = match[1].toLowerCase() as 'wf' | 'concept';
  
  return {
    type: commandType,
    rawText: text
  };
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
