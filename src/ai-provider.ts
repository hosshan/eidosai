import { AIProvider, Command, IssueContext, ImageData } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as core from '@actions/core';

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-3-pro-image-preview') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
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
    const fullContext = `${context.issueBody}\n\n${context.commentBody}`;
    
    if (command.type === 'concept') {
      const aspects = [
        'overall user interface design direction and visual style',
        'key visual elements, branding, and color scheme'
      ];
      const aspect = aspects[imageNumber - 1] || aspects[0];
      
      return `Create a concept image (${imageNumber}/${totalCount}) for the following requirement that shows ${aspect}:

${fullContext}

Generate a high-quality concept visualization that clearly demonstrates ${aspect}. The image should be professional and visually appealing.`;
    } else if (command.type === 'custom') {
      // Custom type: use customPrompt along with full context
      const customInstruction = command.customPrompt || '';
      
      return `Create a custom image (${imageNumber}/${totalCount}) based on the following requirements and custom instruction:

${fullContext}

Custom instruction: ${customInstruction}

Generate a high-quality image that fulfills the above requirements and follows the custom instruction. The image should be professional and visually appealing.`;
    } else {
      // wireframe type
      const aspects = [
        'main page layout and overall structure',
        'detailed UI components and their placement',
        'navigation flow and menu structure',
        'user interaction points and key features'
      ];
      const aspect = aspects[imageNumber - 1] || aspects[0];
      
      return `Create a wireframe image (${imageNumber}/${totalCount}) for the following requirement that shows ${aspect}:

${fullContext}

Generate a clear wireframe diagram that shows ${aspect}. The wireframe should be clean, well-organized, and easy to understand, using typical wireframe conventions (boxes, labels, simple shapes).`;
    }
  }
}

export function createAIProvider(provider: string, apiKey: string, modelName: string): AIProvider {
  switch (provider.toLowerCase()) {
    case 'gemini':
      return new GeminiProvider(apiKey, modelName);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
