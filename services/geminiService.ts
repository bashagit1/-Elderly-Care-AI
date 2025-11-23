import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI
// NOTE: In a production environment, this would likely happen server-side to protect the key,
// but for this architecture, we are demonstrating the "AI Agent" capability.
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export const GeminiService = {
  /**
   * Generates a polite, reassuring WhatsApp message based on the logged activity.
   */
  generateMessage: async (
    residentName: string,
    category: string,
    staffNotes: string
  ): Promise<string> => {
    if (!apiKey) {
      console.warn("Gemini API Key missing. Returning default message.");
      return `Update for ${residentName}: ${category}. ${staffNotes}`;
    }

    const prompt = `
      You are an AI assistant for an elderly care home. 
      Write a warm, short, and reassuring WhatsApp message to the family of resident "${residentName}".
      
      Context:
      - Activity Category: ${category}
      - Staff Notes: "${staffNotes}"
      
      Guidelines:
      - Keep it under 50 words.
      - Be professional yet empathetic and cheerful.
      - Do not mention medical specifics unless clearly stated in notes.
      - Format it for WhatsApp (can use single emojis).
      - Start directly with the message.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || `Update for ${residentName}: ${category}. ${staffNotes}`;
    } catch (error) {
      console.error("Error generating AI message:", error);
      return `Update for ${residentName}: ${category}. ${staffNotes}`;
    }
  }
};