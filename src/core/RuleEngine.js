export class RuleEngine {
    constructor() {
        this.rules = {
            PHY: this.evaluatePhysicalRules.bind(this),
            RES: this.evaluateResourceRules.bind(this),
            SAF: this.evaluateSafetyRules.bind(this),
            TIM: this.evaluateTimingRules.bind(this)
        };
    }

    validate(action, state, farm, crop) {
        const audit = [];
        let isBlocked = false;

        // Sequence: PHY -> RES -> TIM -> SAF (Hierarchical check)
        const order = ['PHY', 'RES', 'TIM', 'SAF'];

        for (const cat of order) {
            const result = this.rules[cat](action, state, farm, crop);
            if (result) {
                audit.push(result);
                if (result.severity === 'CRITICAL' || result.severity === 'HARD') {
                    isBlocked = true;
                    break;
                }
            }
        }

        return { isBlocked, audit };
    }

    evaluatePhysicalRules(action, state, farm, crop) {
        if (action.type === 'SOWING') {
            if (farm.currentTemp < crop.baseTemp + 2) {
                return { category: 'PHY', severity: 'CRITICAL', message: "Soil temperature too low for germination.", rule: "R-PHY-01" };
            }
        }
        return null;
    }

    evaluateResourceRules(action, state, farm, crop) {
        if (action.cost > farm.budget) {
            return { category: 'RES', severity: 'HARD', message: "Insufficient budget for this action.", rule: "R-RES-03" };
        }
        if (action.labor > farm.laborAvailable) {
            return { category: 'RES', severity: 'HARD', message: "Insufficient labor pool available.", rule: "R-RES-03" };
        }
        return null;
    }

    evaluateSafetyRules(action, state, farm, crop) {
        if (action.type === 'FERTILIZATION') {
            if (farm.soilMoisture < 0.12) {
                return { category: 'SAF', severity: 'WARN', message: "Dry soil detected. High risk of nutrient burn.", rule: "R-SAF-02", penalty: 0.15 };
            }
        }
        return null;
    }

    evaluateTimingRules(action, state, farm, crop) {
        // Example: Only allow harvest in HARVEST_READY
        if (action.type === 'HARVEST' && state.stage !== 'HARVEST_READY') {
            return { category: 'TIM', severity: 'CRITICAL', message: "Crop is not physiologically mature for harvest.", rule: "R-TIM-05" };
        }
        return null;
    }
}
