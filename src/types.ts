export interface Command {
  type: 'wf' | 'concept';
  rawText: string;
}

export interface IssueContext {
  issueBody: string;
  commentBody: string;
  issueNumber: number;
  repository: string;
}

export interface AIProvider {
  generateImages(context: IssueContext, command: Command): Promise<string[]>;
}

export interface ImageGenerationResult {
  urls: string[];
  count: number;
}
