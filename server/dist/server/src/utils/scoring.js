"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePoints = calculatePoints;
function calculatePoints(timerSeconds, responseTimeMs, maxPoints = 1000, streak = 0, pointsMultiplier = 1) {
    const timerMs = timerSeconds * 1000;
    const timeRatio = Math.min(responseTimeMs / timerMs, 1);
    const basePoints = Math.ceil(maxPoints * (1 - timeRatio / 2) * pointsMultiplier);
    let streakBonus = 0;
    if (streak >= 2) {
        streakBonus = Math.min(streak * 50, 500);
    }
    return {
        points: basePoints + streakBonus,
        streakBonus,
    };
}
//# sourceMappingURL=scoring.js.map