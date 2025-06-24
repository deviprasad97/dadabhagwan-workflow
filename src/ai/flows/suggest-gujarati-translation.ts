// src/ai/flows/suggest-gujarati-translation.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting Gujarati translations of English text.
 *
 * - suggestGujaratiTranslation - A function that takes English text as input and returns a suggested Gujarati translation.
 * - SuggestGujaratiTranslationInput - The input type for the suggestGujaratiTranslation function.
 * - SuggestGujaratiTranslationOutput - The return type for the suggestGujaratiTranslation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestGujaratiTranslationInputSchema = z.object({
  englishText: z.string().describe('The English text to translate to Gujarati.'),
});
export type SuggestGujaratiTranslationInput = z.infer<typeof SuggestGujaratiTranslationInputSchema>;

const SuggestGujaratiTranslationOutputSchema = z.object({
  gujaratiText: z.string().describe('The translated text in Gujarati.'),
});
export type SuggestGujaratiTranslationOutput = z.infer<
  typeof SuggestGujaratiTranslationOutputSchema
>;

export async function suggestGujaratiTranslation(
  input: SuggestGujaratiTranslationInput
): Promise<SuggestGujaratiTranslationOutput> {
  return suggestGujaratiTranslationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestGujaratiTranslationPrompt',
  input: {schema: SuggestGujaratiTranslationInputSchema},
  output: {schema: SuggestGujaratiTranslationOutputSchema},
  prompt: `You are a translation expert, fluent in both English and Gujarati.

  Translate the following English text into Gujarati:

  {{englishText}}

  Return only the translated text.`,
});

const suggestGujaratiTranslationFlow = ai.defineFlow(
  {
    name: 'suggestGujaratiTranslationFlow',
    inputSchema: SuggestGujaratiTranslationInputSchema,
    outputSchema: SuggestGujaratiTranslationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
