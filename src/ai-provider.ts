import { AIProvider, Command, IssueContext, ImageData, PromptConfig } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as core from '@actions/core';
import {
  wireframeAspects,
  conceptAspects,
  buildWireframePrompt,
  buildConceptPrompt,
  buildCustomPrompt,
  replacePlaceholders
} from './prompts';

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;
  private promptConfig: PromptConfig;

  constructor(apiKey: string, modelName: string = 'gemini-3-pro-image-preview', promptConfig: PromptConfig = {}) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
    this.promptConfig = promptConfig;
  }

  async generateImages(context: IssueContext, command: Command): Promise<ImageData[]> {
    // Determine image count: use specified count or default based on type
    let imageCount: number;
    if (command.count !== undefined) {
      imageCount = command.count;
    } else {
      // Default counts
      if (command.type === 'concept') {
        imageCount = 2;
      } else if (command.type === 'custom') {
        imageCount = 2;
      } else {
        imageCount = 4; // wireframe
      }
    }
    
    const imageType = command.type === 'concept' 
      ? 'concept images' 
      : command.type === 'custom' 
      ? 'custom images' 
      : 'wireframe images';
    
    core.info(`Generating ${imageCount} ${imageType} using ${this.modelName}...`);
    
    try {
      const images: ImageData[] = [];
      
      // Generate each image with a specific prompt
      for (let i = 0; i < imageCount; i++) {
        const prompt = this.buildPrompt(context, command, imageType, i + 1, imageCount);
        core.info(`Generating image ${i + 1}/${imageCount}...`);
        
        const imageData = await this.generateSingleImage(prompt);
        if (imageData) {
          images.push(imageData);
        }
      }
      
      if (images.length === 0) {
        throw new Error('No images were generated');
      }
      
      core.info(`Successfully generated ${images.length} images`);
      return images;
    } catch (error) {
      core.error(`Failed to generate images: ${error}`);
      throw error;
    }
  }

  private async generateSingleImage(prompt: string): Promise<ImageData | null> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      
      const response = result.response;
      
      // Check if the response contains image data
      // The Gemini image generation API should return base64 encoded images
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        
        // Look for image parts in the response
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            // Check if this part contains inline data (image)
            if ('inlineData' in part && part.inlineData) {
              const mimeType = part.inlineData.mimeType || 'image/png';
              const base64Data = part.inlineData.data;
              
              // Return ImageData object with mimeType and base64Data
              return {
                mimeType,
                base64Data,
              };
            }
          }
        }
        
        // If no inline data found, check if there's text that might contain image data
        // This is a fallback for different response formats
        const text = response.text();
        if (text) {
          core.info(`Response text received: ${text.substring(0, 100)}...`);
        }
      }
      
      // If we reach here, the response format is not as expected
      core.warning('No image data found in response. The model may not support image generation or returned an unexpected format.');
      throw new Error('No image data found in response. Please verify that the model supports image generation.');
    } catch (error) {
      core.error(`Error generating single image: ${error}`);
      throw error;
    }
  }

  private buildPrompt(context: IssueContext, command: Command, imageType: string, imageNumber: number, totalCount: number): string {
    // Combine Issue body and comment body as context
    // If excludeIssueBody is true, only use comment body
    const fullContext = command.excludeIssueBody 
      ? context.commentBody 
      : `${context.issueBody}\n\n${context.commentBody}`;
    
    if (command.type === 'concept') {
      const aspects = this.promptConfig.conceptAspects || conceptAspects;
      const aspect = aspects[imageNumber - 1] || aspects[0];
      
      const params = {
        imageNumber,
        totalCount,
        aspect,
        fullContext
      };
      
      // Use custom template if provided, otherwise use default function
      if (this.promptConfig.conceptTemplate) {
        return replacePlaceholders(this.promptConfig.conceptTemplate, params);
      } else {
        return buildConceptPrompt(params);
      }
    } else if (command.type === 'custom') {
      // Custom type: use customPrompt along with full context
      const customInstruction = command.customPrompt || '';
      const aspect = ''; // Custom type doesn't use aspects
      
      const params = {
        imageNumber,
        totalCount,
        aspect,
        fullContext,
        customInstruction
      };
      
      // Use custom template if provided, otherwise use default function
      if (this.promptConfig.customTemplate) {
        return replacePlaceholders(this.promptConfig.customTemplate, params);
      } else {
        return buildCustomPrompt(params);
      }
    } else {
      // wireframe type
      const aspects = this.promptConfig.wireframeAspects || wireframeAspects;
      const aspect = aspects[imageNumber - 1] || aspects[0];
      
      const params = {
        imageNumber,
        totalCount,
        aspect,
        fullContext
      };
      
      // Use custom template if provided, otherwise use default function
      if (this.promptConfig.wireframeTemplate) {
        return replacePlaceholders(this.promptConfig.wireframeTemplate, params);
      } else {
        return buildWireframePrompt(params);
      }
    }
  }
}

export function createAIProvider(provider: string, apiKey: string, modelName: string, promptConfig: PromptConfig = {}): AIProvider {
  switch (provider.toLowerCase()) {
    case 'gemini':
      return new GeminiProvider(apiKey, modelName, promptConfig);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
