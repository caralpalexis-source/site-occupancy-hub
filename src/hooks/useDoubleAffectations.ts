import { useMemo } from "react";
import { AffectationTertiaire, AffectationOperationnelle } from "@/types";

export function isActiveAtDate(dateDebut: string, dateFin: string | undefined, date: Date): boolean {
  const debut = new Date(dateDebut);
  debut.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  if (debut > checkDate) return false;
  if (!dateFin) return true;
  const fin = new Date(dateFin);
  fin.setHours(23, 59, 59, 999);
  return fin >= checkDate;
}

export function getTertiaireKey(a: AffectationTertiaire): string {
  return `${a.nom.trim().toLowerCase()}|${a.prenom.trim().toLowerCase()}`;
}

export function getOperationnelleKey(a: AffectationOperationnelle): string {
  return a.nom_projet.trim().toLowerCase();
}

/** Count unique active tertiaire resources for a zone at a date */
export function countUniqueTertiaires(
  affectations: AffectationTertiaire[],
  zoneId: string,
  date: Date
): number {
  const active = affectations.filter(
    (a) => a.zone_id === zoneId && isActiveAtDate(a.date_debut, a.date_fin, date)
  );
  const unique = new Set(active.map(getTertiaireKey));
  return unique.size;
}

/** Count unique active operationnelle surface for a zone at a date */
export function countUniqueOperationnelles(
  affectations: AffectationOperationnelle[],
  zoneId: string,
  date: Date
): number {
  const active = affectations.filter(
    (a) => a.zone_id === zoneId && isActiveAtDate(a.date_debut, a.date_fin, date)
  );
  // Deduplicate by nom_projet, take max surface for each unique project
  const byProject = new Map<string, number>();
  active.forEach((a) => {
    const key = getOperationnelleKey(a);
    const existing = byProject.get(key) || 0;
    byProject.set(key, Math.max(existing, a.surface_necessaire));
  });
  let total = 0;
  byProject.forEach((v) => (total += v));
  return total;
}

export interface DoubleAffectationInfo {
  tertiaires: { key: string; nom: string; prenom: string; count: number }[];
  operationnelles: { key: string; nom_projet: string; count: number }[];
  totalTertiaires: number;
  totalOperationnelles: number;
}

/** Detect resources with multiple active affectations at a given date */
export function useDoubleAffectations(
  affectationsTertiaires: AffectationTertiaire[],
  affectationsOperationnelles: AffectationOperationnelle[],
  date: Date
): DoubleAffectationInfo {
  return useMemo(() => {
    // Tertiaires: count occurrences per unique key
    const activeTertiaires = affectationsTertiaires.filter((a) =>
      isActiveAtDate(a.date_debut, a.date_fin, date)
    );
    const tertiaireMap = new Map<string, { nom: string; prenom: string; count: number }>();
    activeTertiaires.forEach((a) => {
      const key = getTertiaireKey(a);
      const existing = tertiaireMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        tertiaireMap.set(key, { nom: a.nom, prenom: a.prenom, count: 1 });
      }
    });
    const doubleTertiaires = Array.from(tertiaireMap.entries())
      .filter(([, v]) => v.count > 1)
      .map(([key, v]) => ({ key, ...v }));

    // Operationnelles: count occurrences per unique key
    const activeOps = affectationsOperationnelles.filter((a) =>
      isActiveAtDate(a.date_debut, a.date_fin, date)
    );
    const opMap = new Map<string, { nom_projet: string; count: number }>();
    activeOps.forEach((a) => {
      const key = getOperationnelleKey(a);
      const existing = opMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        opMap.set(key, { nom_projet: a.nom_projet, count: 1 });
      }
    });
    const doubleOps = Array.from(opMap.entries())
      .filter(([, v]) => v.count > 1)
      .map(([key, v]) => ({ key, ...v }));

    return {
      tertiaires: doubleTertiaires,
      operationnelles: doubleOps,
      totalTertiaires: doubleTertiaires.length,
      totalOperationnelles: doubleOps.length,
    };
  }, [affectationsTertiaires, affectationsOperationnelles, date]);
}

/** Get a Set of affectation IDs that are part of double affectations */
export function useDoubleAffectationIds(
  affectationsTertiaires: AffectationTertiaire[],
  affectationsOperationnelles: AffectationOperationnelle[],
  date: Date
): { tertiaireIds: Set<string>; operationnelleIds: Set<string> } {
  return useMemo(() => {
    const activeTertiaires = affectationsTertiaires.filter((a) =>
      isActiveAtDate(a.date_debut, a.date_fin, date)
    );
    const tertiaireByKey = new Map<string, AffectationTertiaire[]>();
    activeTertiaires.forEach((a) => {
      const key = getTertiaireKey(a);
      const list = tertiaireByKey.get(key) || [];
      list.push(a);
      tertiaireByKey.set(key, list);
    });
    const tertiaireIds = new Set<string>();
    tertiaireByKey.forEach((list) => {
      if (list.length > 1) list.forEach((a) => tertiaireIds.add(a.id));
    });

    const activeOps = affectationsOperationnelles.filter((a) =>
      isActiveAtDate(a.date_debut, a.date_fin, date)
    );
    const opByKey = new Map<string, AffectationOperationnelle[]>();
    activeOps.forEach((a) => {
      const key = getOperationnelleKey(a);
      const list = opByKey.get(key) || [];
      list.push(a);
      opByKey.set(key, list);
    });
    const operationnelleIds = new Set<string>();
    opByKey.forEach((list) => {
      if (list.length > 1) list.forEach((a) => operationnelleIds.add(a.id));
    });

    return { tertiaireIds, operationnelleIds };
  }, [affectationsTertiaires, affectationsOperationnelles, date]);
}
