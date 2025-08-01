/**
 * Custom hook for generating AI-powered comparison verdicts
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { fetchGeminiSummary } from '../api/gemini';
import {Phone} from '../api/phones'

export interface AIVerdictState {
  verdict: string | null;
  isLoading: boolean;
  error: string | null;
  characterCount: number;
  retryCount: number;
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
  const [characterCount, setCharacterCount] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const [lastPhones, setLastPhones] = useState<Phone[]>([]);
  const [lastUserContext, setLastUserContext] = useState<string | undefined>();

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

    return `You are an expert smartphone reviewer providing a comprehensive comparison analysis for a user.

${contextSection}
Please provide a detailed analysis (approximately 1000 characters) covering:

**Overview**: Brief introduction to the comparison
**Key Differences**: Major distinguishing factors between the phones
**Strengths & Weaknesses**: For each phone, highlight what it does well and where it falls short
**Final Recommendation**: Clear winner with detailed reasoning

${phoneDescriptions}

Format your response with clear sections and use markdown for emphasis. Target length: 800-1200 characters for comprehensive analysis that helps users make informed decisions.`.trim();
  }, []);

  /**
   * Generate AI verdict for phone comparison with retry logic for short responses
   */
  const generateVerdict = useCallback(async (phones: Phone[], userContext?: string): Promise<void> => {
    if (phones.length === 0) {
      setError('No phones to compare');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVerdict(null);
    setRetryCount(0);
    setLastPhones(phones);
    setLastUserContext(userContext);

    const attemptGeneration = async (attempt: number = 0): Promise<void> => {
      try {
        const prompt = buildComparisonPrompt(phones, userContext);
        setLastPrompt(prompt);
        
        const aiResponse = await fetchGeminiSummary(prompt);
        
        if (aiResponse && aiResponse.trim()) {
          const trimmedResponse = aiResponse.trim();
          const charCount = trimmedResponse.length;
          setCharacterCount(charCount);
          
          // Check if response is too short and we haven't exceeded max retries
          if (charCount < 800 && attempt < 2) {
            console.log(`Response too short (${charCount} chars), retrying... (attempt ${attempt + 1})`);
            setRetryCount(attempt + 1);
            
            // Enhanced prompt for retry
            const enhancedPrompt = `${prompt}

IMPORTANT: The previous response was too brief (${charCount} characters). Please provide a more comprehensive analysis with at least 800-1000 characters. Include more detailed explanations for each section, specific examples, and thorough reasoning for your recommendations.`;
            
            setLastPrompt(enhancedPrompt);
            const retryResponse = await fetchGeminiSummary(enhancedPrompt);
            
            if (retryResponse && retryResponse.trim()) {
              const retryTrimmed = retryResponse.trim();
              setCharacterCount(retryTrimmed.length);
              setVerdict(retryTrimmed);
              toast.success('Successfully generated AI verdict.');
            } else {
              // If retry fails, use original response
              setVerdict(trimmedResponse);
              toast.success('Successfully generated AI verdict.');
            }
          } else {
            setVerdict(trimmedResponse);
            toast.success('Successfully generated AI verdict.');
          }
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
      }
    };

    try {
      await attemptGeneration();
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
    setCharacterCount(0);
    setRetryCount(0);
  }, []);

  const state: AIVerdictState = {
    verdict,
    isLoading,
    error,
    characterCount,
    retryCount
  };

  const actions = useMemo(() => ({
    generateVerdict,
    clearVerdict,
    retry
  }), [generateVerdict, clearVerdict, retry]);

  return [state, actions];
}