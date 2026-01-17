import * as core from '@actions/core';
import * as github from '@actions/github';
import { parseCommand } from './parser';
import { createAIProvider } from './ai-provider';
import { GitHubService } from './github-service';
import { GCSService } from './gcs-service';
import { GCSConfig } from './types';

async function run(): Promise<void> {
  try {
    // Get inputs
    const githubToken = core.getInput('github-token', { required: true });
    const aiProvider = core.getInput('ai-provider', { required: false }) || 'gemini';
    const aiApiKey = core.getInput('ai-api-key', { required: true });
    const modelName = core.getInput('model-name', { required: false }) || 'gemini-3-pro-image-preview';

    // Get GCS inputs
    const gcsProjectId = core.getInput('gcs-project-id', { required: true });
    const gcsBucketName = core.getInput('gcs-bucket-name', { required: true });
    const gcsServiceAccountKey = core.getInput('gcs-service-account-key', { required: true });
    const gcsSignedUrlExpiry = parseInt(
      core.getInput('gcs-signed-url-expiry', { required: false }) || '2592000',
      10
    );

    core.info('Starting gen-visual action...');

    // Initialize services
    const githubService = new GitHubService(githubToken);
    const issueContext = githubService.getIssueContext();

    core.info(`Processing issue #${issueContext.issueNumber}`);
    core.info(`Repository: ${issueContext.repository}`);

    // Parse command from comment or issue body
    const command = parseCommand(issueContext.commentBody);
    
    if (!command) {
      core.info('No @gen-visual command found in comment. Skipping.');
      return;
    }

    core.info(`Command detected: @gen-visual ${command.type}`);

    // Initialize GCS service
    const gcsConfig: GCSConfig = {
      projectId: gcsProjectId,
      bucketName: gcsBucketName,
      serviceAccountKey: gcsServiceAccountKey,
      signedUrlExpiry: gcsSignedUrlExpiry,
    };
    const gcsService = new GCSService(gcsConfig);

    // Create AI provider
    const provider = createAIProvider(aiProvider, aiApiKey, modelName);

    // Generate images
    core.info('Generating images...');
    const imageDataArray = await provider.generateImages(issueContext, command);

    if (imageDataArray.length === 0) {
      core.warning('No images were generated');
      return;
    }

    // Upload images to GCS and get signed URLs
    core.info('Uploading images to GCS...');
    const imageUrls: string[] = [];
    for (let i = 0; i < imageDataArray.length; i++) {
      core.info(`Uploading image ${i + 1}/${imageDataArray.length}...`);
      const signedUrl = await gcsService.uploadImage(imageDataArray[i]);
      imageUrls.push(signedUrl);
    }

    // Post comment with images
    core.info('Posting comment with generated images...');
    await githubService.postComment(issueContext.issueNumber, imageUrls, command);

    core.info('Successfully completed gen-visual action!');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}

run();
