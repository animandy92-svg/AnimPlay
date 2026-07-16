export function calculatePoints(
  timerSeconds: number,
  responseTimeMs: number,
  maxPoints: number = 1000,
  streak: number = 0
): { points: number; streakBonus: number } {
  const timerMs = timerSeconds * 1000;
  const timeRatio = Math.min(responseTimeMs / timerMs, 1);
  const basePoints = Math.ceil(maxPoints * (1 - timeRatio / 2));

  let streakBonus = 0;
  if (streak >= 2) {
    streakBonus = Math.min(streak * 50, 500);
  }

  return {
    points: basePoints + streakBonus,
    streakBonus,
  };
}
