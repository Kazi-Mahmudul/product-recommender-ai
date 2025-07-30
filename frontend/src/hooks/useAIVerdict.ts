/**
 * Custom hook for generating AI-powered comparison verdicts
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Phone } from '../api/phones';
import { fetchGeminiSummary } from '../api/gemini';

export interface AIVerdictState {
  verdict: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AIVerdictActions {
  generateVerdict: (phones: Phone[], userContext?: string) => Promise<void>;
  clearVerdict: () => void;
  retry: () => void;
}

/**
 * Hook for managing AI verdict generation
 */
export function useAIVerdict(): [AIVerdictState, AIVerdictActions] {
  const [verdict, setVerdict] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>('');

  /**
   * Build a structured prompt for phone comparison
   */
  const buildComparisonPrompt = useCallback((phones: Phone[], userContext?: string): string => {
    if (phones.length === 0) return '';

    const phoneDescriptions = phones.map((phone, index) => {
      return `
Phone ${index + 1}: ${phone.brand} ${phone.name}
- Price: BDT ${phone.price || 'N/A'}
- RAM: ${phone.ram_gb ? `${phone.ram_gb}GB` : 'N/A'}
- Storage: ${phone.storage_gb ? `${phone.storage_gb}GB` : 'N/A'}
- Main Camera: ${phone.primary_camera_mp ? `${phone.primary_camera_mp}MP` : 'N/A'}
- Battery: ${phone.battery_capacity_numeric ? `${phone.battery_capacity_numeric}mAh` : 'N/A'}
- Display: ${phone.screen_size_inches ? `${phone.screen_size_inches}"` : 'N/A'}
- Performance Score: ${phone.performance_score ? phone.performance_score.toFixed(1) : 'N/A'}/10
- Camera Score: ${phone.camera_score ? phone.camera_score.toFixed(1) : 'N/A'}/10
- Battery Score: ${phone.battery_score ? phone.battery_score.toFixed(1) : 'N/A'}/10
- Display Score: ${phone.display_score ? phone.display_score.toFixed(1) : 'N/A'}/10
- Chipset: ${phone.chipset || 'N/A'}
- Operating System: ${phone.operating_system || 'N/A'}
- Quick Charging: ${phone.quick_charging || 'N/A'}
- Wireless Charging: ${phone.has_wireless_charging ? 'Yes' : 'No'}
      `.trim();
    }).join('\n\n');

    const contextSection = userContext ? `\nUser Context: ${userContext}\n` : '';

    return `You are an expert smartphone reviewer providing a concise comparison for a user.

${contextSection}
Please analyze these ${phones.length} smartphones and provide a brief verdict, highlighting the key differences and declaring a winner.

${phoneDescriptions}

Keep the response under 500 characters, focusing on the most important factors for a purchasing decision. Use Markdown for formatting (e.g., **bolding**, *italics*, and lists).`.trim();
  }, []);

  /**
   * Generate AI verdict for phone comparison
   */
  const generateVerdict = useCallback(async (phones: Phone[], userContext?: string): Promise<void> => {
    if (phones.length === 0) {
      setError('No phones to compare');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVerdict(null);

    try {
      const prompt = buildComparisonPrompt(phones, userContext);
      setLastPrompt(prompt);
      
      const aiResponse = await fetchGeminiSummary(prompt);
      
      if (aiResponse && aiResponse.trim()) {
        setVerdict(aiResponse.trim());
      } else {
        throw new Error('Empty response from AI service');
      }
    } catch (error) {
      console.error('Error generating AI verdict:', error);
      
      let errorMessage = 'Failed to generate AI verdict. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'AI service request timed out. Please try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [buildComparisonPrompt]);

  /**
   * Retry the last verdict generation
   */
  const retry = useCallback(async (): Promise<void> => {
    if (!lastPrompt) {
      setError('No previous request to retry');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const aiResponse = await fetchGeminiSummary(lastPrompt);
      
      if (aiResponse && aiResponse.trim()) {
        setVerdict(aiResponse.trim());
      } else {
        throw new Error('Empty response from AI service');
      }
    } catch (error) {
      console.error('Error retrying AI verdict:', error);
      setError('Failed to generate AI verdict. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [lastPrompt]);

  /**
   * Clear current verdict and error state
   */
  const clearVerdict = useCallback(() => {
    setVerdict(null);
    setError(null);
    setIsLoading(false);
    setLastPrompt('');
  }, []);

  const state: AIVerdictState = {
    verdict,
    isLoading,
    error
  };

  const actions = useMemo(() => ({
    generateVerdict,
    clearVerdict,
    retry
  }), [generateVerdict, clearVerdict, retry]);

  return [state, actions];
}