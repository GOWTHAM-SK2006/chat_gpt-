import { StateEngine } from './StateEngine.js';
import { RuleEngine } from './RuleEngine.js';
import { ExplanationEngine } from './ExplanationEngine.js';
import { UnderstandingEngine } from './UnderstandingEngine.js';

export class DecisionOrchestrator {
    constructor(cropProfile, farmProfile) {
        this.stateEngine = new StateEngine(cropProfile);
        this.ruleEngine = new RuleEngine();
        this.explanationEngine = new ExplanationEngine();
        this.understandingEngine = new UnderstandingEngine();
        this.farm = farmProfile;
        this.crop = cropProfile;
        this.history = []; // Conversation memory
    }

    async processAction(userInput) {
        // [1] Understanding Brain (Gemini) - Now Context-Aware
        const intent = await this.understandingEngine.extractIntent(userInput, this.history);

        const state = this.stateEngine.getState();

        // Map intent to logical action
        const action = this.mapIntentToAction(intent);

        // [2] Decision Brain (Rules + State)
        const validation = action.type !== 'no_action' ?
            this.ruleEngine.validate(action, state, this.farm, this.crop) :
            { isBlocked: false, audit: [] };

        if (!validation.isBlocked && action.type !== 'no_action') {
            validation.audit.forEach(issue => {
                if (issue.penalty) {
                    this.stateEngine.applyPenalty(issue.penalty, issue.message);
                }
            });

            // Specific intent handling (e.g. tracking neglect)
            if (intent.action_type === 'missed_irrigation') {
                this.stateEngine.applyPenalty(0.05, "User reported missed irrigation");
            }

            if (action.cost) this.farm.budget -= action.cost;
            if (action.type === 'SOWING') {
                this.stateEngine.currentStage = 'SOWING';
            }
        }

        // [3] Explanation Brain (Gemini - Natural Dialogue) - Now Context-Aware
        intent.userInput = userInput;
        const explanation = await this.explanationEngine.generate(validation, this.stateEngine.getState(), intent, this.history);

        // Update History (Keep last 10 turns to avoid context overflow)
        this.history.push({ role: 'user', content: userInput });
        this.history.push({ role: 'assistant', content: explanation });
        if (this.history.length > 20) this.history = this.history.slice(-20);

        return {
            intent: intent,
            accepted: !validation.isBlocked,
            explanation: explanation,
            newState: this.stateEngine.getState()
        };
    }

    mapIntentToAction(intent) {
        switch (intent.action_type) {
            case 'sowing_request': return { type: 'SOWING', cost: 500, labor: 2 };
            case 'missed_irrigation': return { type: 'IRRIGATION_MISSED', cost: 0, labor: 0 };
            case 'harvest_request': return { type: 'HARVEST', cost: 200, labor: 5 };
            case 'delayed_nutrition': return { type: 'FERTILIZATION_DELAYED', cost: 0, labor: 0 };
            case 'general_query': return { type: 'no_action', cost: 0, labor: 0 };
            default: return { type: 'no_action', cost: 0, labor: 0 };
        }
    }

    injectShock(shock) {
        this.stateEngine.applyPenalty(shock.severity, shock.type);
        return {
            explanation: `🚨 ${shock.type} shock detected. Severity: ${shock.severity}. Recalculating achievable yield...`,
            newState: this.stateEngine.getState()
        };
    }
}
