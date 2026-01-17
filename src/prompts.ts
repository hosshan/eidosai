/**
 * Default prompt templates for image generation
 */

export const wireframeAspects = [
  'main page layout and overall structure',
  'detailed UI components and their placement',
  'navigation flow and menu structure',
  'user interaction points and key features'
];

export const conceptAspects = [
  'overall user interface design direction and visual style',
  'key visual elements, branding, and color scheme'
];

export interface PromptParams {
  imageNumber: number;
  totalCount: number;
  aspect: string;
  fullContext: string;
  customInstruction?: string;
  commonContext?: string;
}

/**
 * Build a wireframe prompt
 */
export function buildWireframePrompt(params: PromptParams): string {
  const { imageNumber, totalCount, aspect, fullContext, commonContext } = params;
  
  const commonContextSection = commonContext 
    ? `## Service Context\n${commonContext}\n\n` 
    : '';
  
  return `${commonContextSection}Create a wireframe image (${imageNumber}/${totalCount}) for the following requirement that shows ${aspect}:

${fullContext}

Generate a clear wireframe diagram that shows ${aspect}. The wireframe should be clean, well-organized, and easy to understand, using typical wireframe conventions (boxes, labels, simple shapes).`;
}

/**
 * Build a concept prompt
 */
export function buildConceptPrompt(params: PromptParams): string {
  const { imageNumber, totalCount, aspect, fullContext, commonContext } = params;
  
  const commonContextSection = commonContext 
    ? `## Service Context\n${commonContext}\n\n` 
    : '';
  
  return `${commonContextSection}Create a concept image (${imageNumber}/${totalCount}) for the following requirement that shows ${aspect}:

${fullContext}

Generate a high-quality concept visualization that clearly demonstrates ${aspect}. The image should be professional and visually appealing.`;
}

/**
 * Build a custom prompt
 */
export function buildCustomPrompt(params: PromptParams): string {
  const { imageNumber, totalCount, fullContext, customInstruction, commonContext } = params;
  
  const commonContextSection = commonContext 
    ? `## Service Context\n${commonContext}\n\n` 
    : '';
  
  return `${commonContextSection}Create a custom image (${imageNumber}/${totalCount}) based on the following requirements and custom instruction:

${fullContext}

Custom instruction: ${customInstruction || ''}

Generate a high-quality image that fulfills the above requirements and follows the custom instruction. The image should be professional and visually appealing.`;
}

/**
 * Replace placeholders in a template string
 */
export function replacePlaceholders(template: string, params: PromptParams): string {
  let result = template;
  
  result = result.replace(/\{\{imageNumber\}\}/g, String(params.imageNumber));
  result = result.replace(/\{\{totalCount\}\}/g, String(params.totalCount));
  result = result.replace(/\{\{aspect\}\}/g, params.aspect || '');
  result = result.replace(/\{\{fullContext\}\}/g, params.fullContext);
  result = result.replace(/\{\{customInstruction\}\}/g, params.customInstruction || '');
  result = result.replace(/\{\{commonContext\}\}/g, params.commonContext || '');
  
  return result;
}
