/** Nombre de calculs à résoudre pour arrêter un réveil « Calcul mental ». */
export const MATH_PROBLEM_COUNT = 1;

/** Nombre de secousses pour arrêter un réveil « Secouer ». */
export const SHAKE_GOAL = 5;

export type MathProblem = { text: string; answer: number };

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Addition d'un nombre à 3 chiffres et d'un nombre à 2 chiffres (ex. « 347 + 68 »). */
export function generateMathProblem(): MathProblem {
  const a = randInt(100, 999);
  const b = randInt(10, 99);
  return { text: `${a} + ${b}`, answer: a + b };
}

export type AccelerationSample = { x: number; y: number; z: number };

/**
 * Détecteur de secousses. Une secousse = accélération totale au-delà de `threshold`
 * (en g ; 1 g = téléphone immobile), espacée d'au moins `minGapMs` de la précédente.
 */
export function createShakeDetector(threshold = 1.8, minGapMs = 250) {
  let last = -Infinity;
  return (s: AccelerationSample, now: number): boolean => {
    const magnitude = Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);
    if (magnitude < threshold || now - last < minGapMs) return false;
    last = now;
    return true;
  };
}
