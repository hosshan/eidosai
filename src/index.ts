import * as core from '@actions/core';
import * as github from '@actions/github';
import { parseCommand } from './parser';
import { createAIProvider } from './ai-provider';
import { GitHubService } from './github-service';

async function run(): Promise<void> {
  try {
    // Get inputs
    const githubToken = core.getInput('github-token', { required: true });
    const aiProvider = core.getInput('ai-provider', { required: false }) || 'gemini';
    const aiApiKey = core.getInput('ai-api-key', { required: true });
    const modelName = core.getInput('model-name', { required: false }) || 'gemini-3-pro-image-preview';

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

    // Create AI provider
    const provider = createAIProvider(aiProvider, aiApiKey, modelName);

    // Generate images
    core.info('Generating images...');
    const imageUrls = await provider.generateImages(issueContext, command);

    if (imageUrls.length === 0) {
      core.warning('No images were generated');
      return;
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
