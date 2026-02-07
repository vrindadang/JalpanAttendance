import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord } from "../types";

export const GeminiService = {
  generateDailySummary: async (date: string, records: AttendanceRecord[]): Promise<string> => {
    // Guidelines state we must assume process.env.API_KEY is available and configured
    if (!process.env.API_KEY) {
      console.warn("API Key is missing in environment.");
      return "AI analysis is currently unavailable. Please configure the environment variable.";
    }

    if (records.length === 0) {
      return "No records found for this date to analyze.";
    }

    try {
      // Initialize GoogleGenAI right before the call using the direct process.env.API_KEY string
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const recordsText = records.map(r => 
        `- ${r.sewadarName} at ${r.counterName}: ${r.inTime} to ${r.outTime || 'Present'}`
      ).join('\n');

      const prompt = `
        You are the Quality and Attendance Manager for Jalpan Services.
        Analyze the following attendance logs for ${date}.
        
        Logs:
        ${recordsText}

        Please provide a concise summary that includes:
        1. Total sewadars present.
        2. Breakdown of coverage by counter (which counters were most staffed).
        3. A polite closing remark for the daily report.
        
        Keep the tone professional and service-oriented (Sewa bhav).
        Format the output as plain text suitable for a WhatsApp message.
      `;

      // Always use ai.models.generateContent to query GenAI with both model and contents
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      // text is a property that directly returns the extracted string output
      return response.text || "Could not generate summary.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "An error occurred while generating the AI summary.";
    }
  }
};