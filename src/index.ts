import * as core from '@actions/core';
import * as github from '@actions/github';
import { parseCommand } from './parser';
import { createAIProvider } from './ai-provider';
import { GitHubService } from './github-service';
import { GCSService } from './gcs-service';
import { GCSConfig, PromptConfig } from './types';

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

    // Get prompt configuration inputs
    const wireframeTemplate = core.getInput('system-prompt-wf', { required: false });
    const conceptTemplate = core.getInput('system-prompt-concept', { required: false });
    const customTemplate = core.getInput('system-prompt-custom', { required: false });
    const modifyTemplate = core.getInput('system-prompt-modify', { required: false });
    const wireframeAspectsInput = core.getInput('system-prompt-wf-aspects', { required: false });
    const conceptAspectsInput = core.getInput('system-prompt-concept-aspects', { required: false });
    const commonContext = core.getInput('system-prompt-common-context', { required: false });

    // Build PromptConfig
    const promptConfig: PromptConfig = {};
    
    if (wireframeTemplate) {
      promptConfig.wireframeTemplate = wireframeTemplate;
    }
    if (conceptTemplate) {
      promptConfig.conceptTemplate = conceptTemplate;
    }
    if (customTemplate) {
      promptConfig.customTemplate = customTemplate;
    }
    if (modifyTemplate) {
      promptConfig.modifyTemplate = modifyTemplate;
    }
    if (wireframeAspectsInput) {
      promptConfig.wireframeAspects = wireframeAspectsInput.split(',').map(a => a.trim()).filter(a => a.length > 0);
    }
    if (conceptAspectsInput) {
      promptConfig.conceptAspects = conceptAspectsInput.split(',').map(a => a.trim()).filter(a => a.length > 0);
    }
    if (commonContext) {
      promptConfig.commonContext = commonContext;
    }

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

    core.info(`Command detected: @gen-visual ${command.type}${command.count ? ` ${command.count}` : ''}${command.customPrompt ? ` "${command.customPrompt}"` : ''}`);

    // For modify command, extract and download reference images from comment
    if (command.type === 'modify') {
      try {
        core.info('Extracting reference images from comment...');
        const referenceImages = await githubService.extractAndDownloadImages(issueContext.commentBody);
        if (referenceImages.length > 0) {
          issueContext.referenceImages = referenceImages;
          core.info(`Found ${referenceImages.length} reference image(s)`);
        } else {
          core.info('No reference images found in comment. Will generate based on design instructions only.');
        }
      } catch (error) {
        core.warning(`Failed to extract reference images, but continuing: ${error}`);
        // Continue without reference images
      }
    }

    // Add reaction to comment or issue
    try {
      if (issueContext.isFromComment && issueContext.commentId) {
        await githubService.addReactionToComment(issueContext.commentId);
      } else {
        await githubService.addReactionToIssue(issueContext.issueNumber);
      }
    } catch (error) {
      core.warning(`Failed to add reaction, but continuing: ${error}`);
    }

    // Create progress comment
    const imageType = command.type === 'concept' 
      ? 'Concept Images' 
      : command.type === 'custom' 
      ? 'Custom Images' 
      : command.type === 'modify'
      ? 'Modified Images'
      : 'Wireframe Images';
    let progressCommentId: number;
    try {
      progressCommentId = await githubService.createProgressComment(issueContext.issueNumber, command);
    } catch (error) {
      core.error(`Failed to create progress comment: ${error}`);
      throw error;
    }

    // Initialize GCS service
    const gcsConfig: GCSConfig = {
      projectId: gcsProjectId,
      bucketName: gcsBucketName,
      serviceAccountKey: gcsServiceAccountKey,
      signedUrlExpiry: gcsSignedUrlExpiry,
    };
    const gcsService = new GCSService(gcsConfig);

    // Create AI provider
    const provider = createAIProvider(aiProvider, aiApiKey, modelName, promptConfig);

    // Generate images
    core.info('Generating images...');
    try {
      await githubService.updateProgressComment(
        progressCommentId,
        issueContext.issueNumber,
        `## ${imageType}\n\n⏳ 画像を生成中...\n\n*Generated by @gen-visual*`
      );
    } catch (error) {
      core.warning(`Failed to update progress comment: ${error}`);
    }

    const imageDataArray = await provider.generateImages(issueContext, command);

    if (imageDataArray.length === 0) {
      core.warning('No images were generated');
      try {
        await githubService.updateProgressComment(
          progressCommentId,
          issueContext.issueNumber,
          `## ${imageType}\n\n❌ 画像の生成に失敗しました。\n\n*Generated by @gen-visual*`
        );
      } catch (error) {
        core.warning(`Failed to update progress comment: ${error}`);
      }
      return;
    }

    // Upload images to GCS and get signed URLs
    core.info(`Starting upload of ${imageDataArray.length} images to GCS...`);
    const imageUrls: string[] = [];
    const uploadStartTime = Date.now();
    
    for (let i = 0; i < imageDataArray.length; i++) {
      core.info(`\n--- Uploading image ${i + 1}/${imageDataArray.length} ---`);
      
      // Update progress during upload
      try {
        await githubService.updateProgressComment(
          progressCommentId,
          issueContext.issueNumber,
          `## ${imageType}\n\n📤 画像をアップロード中... (${i + 1}/${imageDataArray.length})\n\n*Generated by @gen-visual*`
        );
      } catch (error) {
        core.warning(`Failed to update progress comment: ${error}`);
      }
      
      try {
        const signedUrl = await gcsService.uploadImage(imageDataArray[i]);
        imageUrls.push(signedUrl);
        core.info(`✓ Image ${i + 1}/${imageDataArray.length} uploaded successfully`);
        core.info(`  URL: ${signedUrl}`);
      } catch (error) {
        core.error(`✗ Failed to upload image ${i + 1}/${imageDataArray.length}`);
        throw error;
      }
    }
    
    // アップロード完了時のサマリーログ
    const uploadDuration = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
    core.info(`\n=== Upload Summary ===`);
    core.info(`Total images uploaded: ${imageUrls.length}/${imageDataArray.length}`);
    core.info(`Upload duration: ${uploadDuration}s`);
    core.info(`Uploaded URLs:`);
    imageUrls.forEach((url, index) => {
      core.info(`  ${index + 1}. ${url}`);
    });

    // Post comment with images (update progress comment)
    core.info('Posting comment with generated images...');
    await githubService.postComment(issueContext.issueNumber, imageUrls, command, progressCommentId);

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
