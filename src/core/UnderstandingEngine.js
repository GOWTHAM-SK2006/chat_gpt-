import Groq from "groq-sdk";

export class UnderstandingEngine {
    constructor() {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        this.groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
    }

    async extractIntent(text, history = []) {
        const historyText = history.map(h => `${h.role}: ${h.content}`).join("\n");
        const prompt = `
        You are a farmer intent extraction engine.
        Extract the action the farmer is trying to take or the situation they are reporting.

        Recent Conversation History for Context:
        ${historyText}

        Allowed action types ONLY:
        - normal_progress (Positive status, no action needed)
        - missed_irrigation (Failure to water, rain absence, dry field)
        - delayed_nutrition (Delayed fertilizer, urea, or manure)
        - pest_suspected (Observation of pests, bugs, or diseased leaves)
        - sowing_request (Request to start planting or sowing)
        - harvest_request (Request to start harvesting)
        - general_query (ANY other question, greeting, or topic not listed above)

        Input: "${text}"

        Return ONLY a JSON object with:
        - action_type: string
        - urgency: "low" | "medium" | "high"
        - confidence: number (0.0 to 1.0)
        
        Example: {"action_type": "missed_irrigation", "urgency": "high", "confidence": 0.9}
        `;

        try {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" }
            });

            const content = chatCompletion.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            console.error("Brain 1 (Understanding) Error:", error);
            return { action_type: "no_action", urgency: "low", confidence: 0.1 };
        }
    }
}
