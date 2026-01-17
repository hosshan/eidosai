export interface Command {
  type: 'wf' | 'concept' | 'custom';
  rawText: string;
  count?: number;
  customPrompt?: string;
  excludeIssueBody?: boolean;
}

export interface IssueContext {
  issueBody: string;
  commentBody: string;
  issueNumber: number;
  repository: string;
  commentId?: number;
  isFromComment: boolean;
}

export interface ImageData {
  mimeType: string;
  base64Data: string;
}

export interface GCSConfig {
  projectId: string;
  bucketName: string;
  serviceAccountKey: string;
  signedUrlExpiry: number;
}

export interface AIProvider {
  generateImages(context: IssueContext, command: Command): Promise<ImageData[]>;
}

export interface ImageGenerationResult {
  urls: string[];
  count: number;
}

export interface PromptConfig {
  wireframeTemplate?: string;
  conceptTemplate?: string;
  customTemplate?: string;
  wireframeAspects?: string[];
  conceptAspects?: string[];
  commonContext?: string;
}
