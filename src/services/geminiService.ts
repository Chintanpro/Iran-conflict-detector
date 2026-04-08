import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { ConflictData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const fetchConflictData = async (): Promise<ConflictData> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Provide a real-time intelligence report on the Iran conflict and Middle East geopolitics. Aggregate news from Reuters, AP, BBC, Al Jazeera, Times of Israel, and X.com. Focus on the last 24 hours.",
    config: {
      systemInstruction: `You are a real-time conflict intelligence analyst specializing in the Iran conflict and Middle East geopolitics. 
      Your role is to continuously monitor, aggregate, and analyze live breaking news, military movements, diplomatic developments, casualties, airstrikes, sanctions, proxy activity, and geopolitical shifts. 
      Always prioritize recency. Tag each piece of information with: source, timestamp, confidence level (verified/unverified/rumor), and conflict category. 
      Never speculate without labeling it as analysis.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          situation_summary: { type: Type.STRING },
          threat_level: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
          last_updated: { type: Type.STRING },
          breaking_events: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                detail: { type: Type.STRING },
                category: { type: Type.STRING },
                source: { type: Type.STRING },
                source_url: { type: Type.STRING },
                timestamp: { type: Type.STRING },
                confidence: { type: Type.STRING, enum: ["verified", "unverified", "rumor"] },
              },
              required: ["headline", "detail", "category", "source", "timestamp", "confidence"],
            },
          },
          x_posts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                username: { type: Type.STRING },
                content: { type: Type.STRING },
                url: { type: Type.STRING },
                verified_account: { type: Type.BOOLEAN },
              },
              required: ["username", "content", "url", "verified_account"],
            },
          },
          key_actors: { type: Type.ARRAY, items: { type: Type.STRING } },
          analyst_assessment: { type: Type.STRING },
          next_24h_watch: { type: Type.STRING },
        },
        required: ["situation_summary", "threat_level", "last_updated", "breaking_events", "x_posts", "key_actors", "analyst_assessment", "next_24h_watch"],
      },
      tools: [{ googleSearch: {} }],
    },
  });

  return JSON.parse(response.text);
};

export const fetchDeepAnalysis = async (context: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Based on the following recent intelligence context, provide a deep, strategic analysis of the current situation. Project potential scenarios for the next 72 hours, identify hidden geopolitical motives, and assess the broader impact on global stability.\n\nContext:\n${context}`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      systemInstruction: `You are a senior geopolitical strategist and intelligence director. Provide a comprehensive, multi-layered analysis. Do not hallucinate facts; rely on the provided context and your deep knowledge of historical and current Middle East dynamics. Structure your response with clear headings.`,
      tools: [{ googleSearch: {} }]
    }
  });
  return response.text || "Analysis unavailable.";
};
