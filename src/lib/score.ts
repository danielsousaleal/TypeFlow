/** Quantos PPM equivalem a 1% de precisão na troca. (20ppm ≈ 2%) */
export const PPM_PER_ACCURACY_POINT = 10;

export function scoreValue(score: { wpm: number; accuracy: number }) {
  return score.wpm + score.accuracy * PPM_PER_ACCURACY_POINT;
}

/**
 * Substitui se o saldo for melhor (ou empatar na troca, ex: +20ppm / -2%).
 * Ex.: cair 2% de precisão mas subir 20ppm ainda sobe no placar.
 */
export function isBetterScore(
  next: { wpm: number; accuracy: number },
  previous: { wpm: number; accuracy: number },
) {
  if (next.wpm === previous.wpm && next.accuracy === previous.accuracy) {
    return false;
  }

  return scoreValue(next) >= scoreValue(previous);
}
