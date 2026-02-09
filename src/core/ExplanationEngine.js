import Groq from "groq-sdk";

export class ExplanationEngine {
    constructor() {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        this.groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
    }

    async generate(auditResult, state, intent, history = []) {
        const historyText = history.map(h => `${h.role}: ${h.content}`).join("\n");
        const context = `
        System Status:
        - Growth Stage: ${state.stage}
        - Health Index: ${(state.health * 100).toFixed(0)}%
        - Yield Potential: ${state.potential.toFixed(0)} kg/ha
        - Permanent Damage: ${state.damaged ? "YES" : "NO"}
        
        Decision Brain Result:
        - Accepted: ${!auditResult.isBlocked}
        - Conflicts: ${auditResult.audit.map(a => a.message).join(", ")}
        
        Recent Conversation History:
        ${historyText}
        
        User Intent: ${intent.action_type} (Urgency: ${intent.urgency})
        `;

        const prompt = `
        You are a friendly, intelligent, and general-purpose conversational AI assistant, exactly like a high-end Gemini or ChatGPT.
        You have FULL freedom to answer ANY question with deep intelligence and creative flair.
        
        CRITICAL GOALS:
        1. **Infinite Variety**: NEVER repeat the same greeting, opening phrase, or sentence structure. Each response must feel unique and fresh.
        2. **Super Conversation**: Your dialogue must be fluid, adaptive, and human-like. Avoid robotic "I understand" or "Based on your input" patterns.
        3. **Contextual Bonding**: Look at the Recent Conversation History. Acknowledge previous points, build upon them, and refer back to them naturally.
        4. **Tanglish Mastery**: If the user uses Tanglish, reply with a creative mix of simple English and conversational Tamil.
        5. **No Intent Labels**: Do not mention "action_type", "intent", or any technical categorization.
        
        Farm Status (Technical Context):
        - Growth Stage: ${state.stage}
        - Health Index: ${(state.health * 100).toFixed(0)}%
        - Yield Potential: ${state.potential.toFixed(0)} kg/ha
        - Permanent Damage: ${state.damaged ? "YES" : "NO"}
        - Decision Brain Result: ${!auditResult.isBlocked ? "Accepted" : "Blocked (" + auditResult.audit[0]?.message + ")"}

        Recent History:
        ${historyText}
        
        User's Current Query: "${intent.userInput}"
        
        Instructions:
        - If the query is general knowledge (e.g., science, history, coding), answer it fully with your general intelligence.
        - If the query relates to the farm/crop, weave the "Farm Status" technical data into a natural conversation. 
        - If a certain action was blocked or caused a penalty, explain the biological "why" (e.g., "Sowing now is risky because the soil isn't ready...") in a supportive tone.
        - Avoid standard templates. Be creative.
        
        Respond directly as the assistant.
        `;

        try {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile"
            });

            return chatCompletion.choices[0].message.content.trim();
        } catch (error) {
            console.error("Brain 3 (Explanation) Error:", error);
            return `I'm having a technical glitch (API Error: ${error.message}). Please check your connection or Groq key.`;
        }
    }
}
