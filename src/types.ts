export interface Command {
  type: 'wf' | 'concept';
  rawText: string;
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
