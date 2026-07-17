export const MAX_ACCURACY_DROP = 10;

/**
 * PPM é o critério principal: uma marca mais rápida pode perder no máximo
 * 10 pontos de precisão. Com o mesmo PPM, só uma precisão maior substitui.
 */
export function isBetterScore(
  next: { wpm: number; accuracy: number },
  previous: { wpm: number; accuracy: number },
) {
  const fasterWithinAccuracyMargin =
    next.wpm > previous.wpm &&
    next.accuracy >= previous.accuracy - MAX_ACCURACY_DROP;
  const moreAccurateAtSameSpeed =
    next.wpm === previous.wpm && next.accuracy > previous.accuracy;

  return fasterWithinAccuracyMargin || moreAccurateAtSameSpeed;
}
