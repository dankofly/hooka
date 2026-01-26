
import { ViralConcept, MarketingBrief, Language } from '../types.ts';

// Constants for timeout configuration
const API_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Ruft die Netlify Serverless Function auf.
 * Mit Client-Side Timeout, um Endlos-Ladezustände zu verhindern.
 */
const callApi = async (action: string, payload: Record<string, unknown> = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch('/.netlify/functions/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, payload }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `Server Error: ${response.status}`;
      
      if (errorMessage.includes("Missing API Key")) {
        throw new Error("MISSING_API_KEY");
      }
      
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`API Call failed (${action}):`, error);
    
    if (error.name === 'AbortError') {
      throw new Error("TIMEOUT: Der Server hat zu lange gebraucht. Bitte versuche es erneut.");
    }
    
    throw error;
  }
};

export const researchBrand = async (url: string, language: Language): Promise<Partial<MarketingBrief>> => {
  return callApi('research', { url, language });
};

export const generateVisualMockup = async (prompt: string): Promise<string> => {
  const result = await callApi('generate-image', { prompt });
  return result.imageUrl;
};

export const generateViralHooks = async (brief: MarketingBrief): Promise<ViralConcept[]> => {
  return callApi('generate-hooks', { brief });
};

// --- ADMIN SERVICES ---

export const verifyAdminPassword = async (password: string): Promise<boolean> => {
  const result = await callApi('verify-admin', { password });
  return result.success;
};

export const getAdminStats = async (password: string): Promise<{ userCount: number; historyCount: number; apiCalls: number }> => {
  return callApi('get-admin-stats', { password });
};

export const getAdminPrompt = async (): Promise<string> => {
  const result = await callApi('get-admin-prompt', {});
  return result.prompt || "";
};

export const saveAdminPrompt = async (password: string, prompt: string): Promise<void> => {
  await callApi('save-admin-prompt', { password, prompt });
};
