import { OpenAI } from 'openai';
import { suggestGujaratiTranslation } from '@/ai/flows/suggest-gujarati-translation';
import type { TranslationStep, TranslationProvider, SupportedLanguage, Board, Card } from './types';

// Language mappings and names
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  'en': 'English',
  'gu': 'Gujarati',
  'de': 'German',
  'hi': 'Hindi',
  'fr': 'French',
  'es': 'Spanish',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
  'ar': 'Arabic'
};

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const sutra = new OpenAI({
  baseURL: 'https://api.two.ai/v2',
  apiKey: process.env.NEXT_PUBLIC_SUTRA_API_KEY,
  dangerouslyAllowBrowser: true
});

// Translation functions for each provider
const translateWithOpenAI = async (text: string, fromLang: string, toLang: string): Promise<string> => {
  const fromLanguage = LANGUAGE_NAMES[fromLang as SupportedLanguage] || fromLang;
  const toLanguage = LANGUAGE_NAMES[toLang as SupportedLanguage] || toLang;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional translator. Translate the following text from ${fromLanguage} to ${toLanguage}. Provide only the translated text without any explanations or additional content.`
      },
      {
        role: "user",
        content: text
      }
    ],
  });

  return response.choices[0].message.content || '';
};

const translateWithSutra = async (text: string, fromLang: string, toLang: string): Promise<string> => {
  const fromLanguage = LANGUAGE_NAMES[fromLang as SupportedLanguage] || fromLang;
  const toLanguage = LANGUAGE_NAMES[toLang as SupportedLanguage] || toLang;
  
  const response = await sutra.chat.completions.create({
    model: 'sutra-v2',
    messages: [
      {
        role: "system",
        content: `You are a professional translator. Translate the following text from ${fromLanguage} to ${toLanguage}. Provide only the translated text without any explanations or additional content.`
      },
      {
        role: "user",
        content: text
      }
    ],
    max_tokens: 1024,
    temperature: 0.3,
  });

  return response.choices[0].message.content || '';
};

const translateWithGenkit = async (text: string, fromLang: string, toLang: string): Promise<string> => {
  // For now, Genkit is specifically for English to Gujarati
  if (fromLang === 'en' && toLang === 'gu') {
    const result = await suggestGujaratiTranslation({ englishText: text });
    return result.gujaratiText;
  }
  throw new Error('Genkit translation only supports English to Gujarati');
};

// Main translation function
export const translateText = async (
  text: string, 
  fromLang: string, 
  toLang: string, 
  provider: TranslationProvider
): Promise<string> => {
  switch (provider) {
    case 'openai':
      return await translateWithOpenAI(text, fromLang, toLang);
    case 'sutra':
      return await translateWithSutra(text, fromLang, toLang);
    case 'genkit':
      return await translateWithGenkit(text, fromLang, toLang);
    case 'google-translate':
      // TODO: Implement Google Translate API
      throw new Error('Google Translate integration not implemented yet');
    default:
      throw new Error(`Unsupported translation provider: ${provider}`);
  }
};

// Create translation flow based on board settings
export const createTranslationFlow = (
  board: Board,
  sourceText: string,
  sourceLanguage?: string
): TranslationStep[] => {
  const settings = board.translationSettings;
  if (!settings) {
    return [];
  }

  const steps: TranslationStep[] = [];
  const srcLang = sourceLanguage || settings.defaultLanguage;
  const targetLang = settings.targetLanguage;

  if (settings.requiresIntermediateTranslation && srcLang !== 'en' && targetLang !== 'en') {
    // Step 1: Original Language → English
    steps.push({
      id: `step_${Date.now()}_1`,
      fromLanguage: srcLang,
      toLanguage: 'en',
      originalText: sourceText,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Step 2: English → Target Language
    steps.push({
      id: `step_${Date.now()}_2`,
      fromLanguage: 'en',
      toLanguage: targetLang,
      originalText: '', // Will be populated from step 1 result
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    // Direct translation
    steps.push({
      id: `step_${Date.now()}_1`,
      fromLanguage: srcLang,
      toLanguage: targetLang,
      originalText: sourceText,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return steps;
};

// Execute a translation step
export const executeTranslationStep = async (
  step: TranslationStep,
  provider: TranslationProvider,
  userUid?: string
): Promise<TranslationStep> => {
  try {
    const updatedStep: TranslationStep = {
      ...step,
      status: 'in_progress',
      provider,
      updatedAt: new Date().toISOString(),
      createdBy: userUid,
    };

    const translatedText = await translateText(
      step.originalText,
      step.fromLanguage,
      step.toLanguage,
      provider
    );

    return {
      ...updatedStep,
      translatedText,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...step,
      status: 'error',
      error: error instanceof Error ? error.message : 'Translation failed',
      provider,
      updatedAt: new Date().toISOString(),
      createdBy: userUid,
    };
  }
};

// Initialize translation flow for a card
export const initializeCardTranslation = (
  card: Card,
  board: Board,
  sourceLanguage?: string
): Card => {
  const settings = board.translationSettings;
  if (!settings) {
    return card;
  }

  // Determine source text (prefer form data over card content)
  const sourceText = card.metadata?.formData?.english_question || 
                    card.metadata?.formData?.question || 
                    card.content;

  const translationFlow = createTranslationFlow(board, sourceText, sourceLanguage);

  return {
    ...card,
    metadata: {
      ...card.metadata,
      sourceLanguage: sourceLanguage || settings.defaultLanguage,
      targetLanguage: settings.targetLanguage,
      translationFlow,
      currentTranslationStep: 0,
      translationStatus: 'not_started',
    },
  };
};

// Get the current translation text from the flow
export const getCurrentTranslation = (card: Card): string => {
  const flow = card.metadata?.translationFlow;
  if (!flow || flow.length === 0) {
    return '';
  }

  // Find the latest completed step
  for (let i = flow.length - 1; i >= 0; i--) {
    const step = flow[i];
    if (step.status === 'completed' || step.status === 'approved') {
      return step.translatedText || '';
    }
  }

  return '';
};

// Check if translation flow is complete
export const isTranslationComplete = (card: Card): boolean => {
  const flow = card.metadata?.translationFlow;
  if (!flow || flow.length === 0) {
    return false;
  }

  return flow.every(step => step.status === 'completed' || step.status === 'approved');
};

// Get next pending translation step
export const getNextTranslationStep = (card: Card): TranslationStep | null => {
  const flow = card.metadata?.translationFlow;
  if (!flow) {
    return null;
  }

  return flow.find(step => step.status === 'pending') || null;
};

// Update translation step in card
export const updateCardTranslationStep = (
  card: Card,
  stepId: string,
  updatedStep: TranslationStep
): Card => {
  const flow = card.metadata?.translationFlow || [];
  const stepIndex = flow.findIndex(step => step.id === stepId);
  
  if (stepIndex === -1) {
    return card;
  }

  const updatedFlow = [...flow];
  updatedFlow[stepIndex] = updatedStep;

  // If this step is complete and there's a next step, prepare it
  if (updatedStep.status === 'completed' && stepIndex < flow.length - 1) {
    const nextStep = updatedFlow[stepIndex + 1];
    if (nextStep.status === 'pending' && !nextStep.originalText) {
      nextStep.originalText = updatedStep.translatedText || '';
    }
  }

  // Update translation status
  let translationStatus: 'not_started' | 'in_progress' | 'needs_review' | 'completed' = 'in_progress';
  if (updatedFlow.every(step => step.status === 'completed' || step.status === 'approved')) {
    translationStatus = 'completed';
  } else if (updatedFlow.some(step => step.status === 'error')) {
    translationStatus = 'needs_review';
  }

  return {
    ...card,
    metadata: {
      ...card.metadata,
      translationFlow: updatedFlow,
      currentTranslationStep: stepIndex + 1,
      translationStatus,
    },
  };
}; 