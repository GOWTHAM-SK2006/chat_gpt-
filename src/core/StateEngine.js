export const GrowthStage = {
    PRE_SOWING: 'PRE_SOWING',
    SOWING: 'SOWING',
    GERMINATION: 'GERMINATION',
    VEGETATIVE: 'VEGETATIVE',
    REPRODUCTIVE: 'REPRODUCTIVE',
    RIPENING: 'RIPENING',
    HARVEST_READY: 'HARVEST_READY',
    HARVESTED: 'HARVESTED',
    FAILED: 'FAILED'
};

export class StateEngine {
    constructor(cropProfile) {
        this.crop = cropProfile;
        this.currentStage = GrowthStage.PRE_SOWING;
        this.healthIndex = 1.0;
        this.yieldCeiling = cropProfile.maxYield;
        this.accumulatedGDD = 0;
        this.isIrreversiblyDamaged = false;
        this.history = [];
    }

    advanceStage(gddIncrease, soilMoisture) {
        if (this.currentStage === GrowthStage.FAILED || this.currentStage === GrowthStage.HARVESTED) return;

        this.accumulatedGDD += gddIncrease;

        const nextStage = this.calculateNextStage(soilMoisture);
        if (nextStage !== this.currentStage) {
            this.history.push({
                from: this.currentStage,
                to: nextStage,
                gdd: this.accumulatedGDD,
                timestamp: Date.now()
            });
            this.currentStage = nextStage;
        }
    }

    calculateNextStage(soilMoisture) {
        switch (this.currentStage) {
            case GrowthStage.PRE_SOWING: return GrowthStage.PRE_SOWING; // Requires User Action
            case GrowthStage.SOWING:
                if (soilMoisture > 0.1) return GrowthStage.GERMINATION;
                return GrowthStage.SOWING;
            case GrowthStage.GERMINATION:
                if (this.accumulatedGDD >= 200) return GrowthStage.VEGETATIVE;
                return GrowthStage.GERMINATION;
            case GrowthStage.VEGETATIVE:
                if (this.accumulatedGDD >= 800) return GrowthStage.REPRODUCTIVE;
                return GrowthStage.VEGETATIVE;
            case GrowthStage.REPRODUCTIVE:
                if (this.accumulatedGDD >= 1200) return GrowthStage.RIPENING;
                return GrowthStage.REPRODUCTIVE;
            case GrowthStage.RIPENING:
                if (this.accumulatedGDD >= 1600) return GrowthStage.HARVEST_READY;
                return GrowthStage.RIPENING;
            default: return this.currentStage;
        }
    }

    applyPenalty(severity, reason) {
        const stageMultiplier = this.getStageMultiplier();
        const totalImpact = severity * stageMultiplier;

        this.healthIndex = Math.max(0, this.healthIndex - totalImpact);
        this.yieldCeiling = this.yieldCeiling * (1 - totalImpact);

        if (this.healthIndex <= 0.3) {
            this.isIrreversiblyDamaged = true;
        }
        if (this.healthIndex <= 0) {
            this.currentStage = GrowthStage.FAILED;
        }

        this.history.push({
            type: 'PENALTY',
            reason,
            impact: totalImpact,
            newCeiling: this.yieldCeiling
        });
    }

    getStageMultiplier() {
        switch (this.currentStage) {
            case GrowthStage.GERMINATION: return 1.5;
            case GrowthStage.VEGETATIVE: return 2.0;
            case GrowthStage.REPRODUCTIVE: return 5.0; // Critical stage
            case GrowthStage.RIPENING: return 1.5;
            default: return 1.0;
        }
    }

    getState() {
        return {
            stage: this.currentStage,
            health: this.healthIndex,
            potential: this.yieldCeiling,
            gdd: this.accumulatedGDD,
            damaged: this.isIrreversiblyDamaged
        };
    }
}
