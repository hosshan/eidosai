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
 * Build a modify prompt
 * If reference images are provided, use them to maintain tone and manner
 * Otherwise, generate based on design instructions
 */
export function buildModifyPrompt(params: PromptParams & { hasReferenceImages?: boolean }): string {
  const { imageNumber, totalCount, fullContext, commonContext, hasReferenceImages } = params;
  
  const commonContextSection = commonContext 
    ? `## Service Context\n${commonContext}\n\n` 
    : '';
  
  if (hasReferenceImages) {
    return `${commonContextSection}You are provided with reference image(s) showing the current screen design. Based on these reference images, modify the design according to the following requirements while maintaining the same tone and manner (color scheme, typography, layout style, visual elements, etc.):

${fullContext}

Generate a modified version (${imageNumber}/${totalCount}) that:
1. Maintains the exact same visual style, color palette, typography, and overall design language as the reference image(s)
2. Incorporates the requested changes (e.g., adding buttons, modifying layouts, updating content)
3. Ensures the modifications blend seamlessly with the existing design
4. Preserves the overall user experience and design consistency

The output should look like a natural evolution of the reference design, not a completely new design.`;
  } else {
    return `${commonContextSection}Create a UI design image (${imageNumber}/${totalCount}) based on the following design requirements:

${fullContext}

Generate a high-quality UI design that fulfills the above requirements. The design should be professional, modern, and visually appealing with a consistent design system.`;
  }
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
