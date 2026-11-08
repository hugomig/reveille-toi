/**
 * Une série de réveils : un groupe de réveils configurés ensemble
 * (ex. « Semaine » : 6h30, 6h40, 6h50 du lundi au vendredi).
 * Le détail des champs sera complété à l'étape 2 (création/édition).
 */
export type AlarmSeries = {
  id: string;
  name: string;
  enabled: boolean;
};
