import { AppData, Zone, AffectationTertiaire, AffectationOperationnelle } from "@/types";

export type Diff =
  | {
      type: "zone_added";
      zoneId: string;
      data: Zone;
    }
  | {
      type: "zone_removed";
      zoneId: string;
      data: Zone;
    }
  | {
      type: "zone_updated";
      zoneId: string;
      field: string;
      from: unknown;
      to: unknown;
      zoneName: string;
    }
  | {
      type: "affectation_added";
      affectationId: string;
      entity: "tertiaire" | "operationnelle";
      data: AffectationTertiaire | AffectationOperationnelle;
    }
  | {
      type: "affectation_removed";
      affectationId: string;
      entity: "tertiaire" | "operationnelle";
      data: AffectationTertiaire | AffectationOperationnelle;
    }
  | {
      type: "affectation_updated";
      affectationId: string;
      entity: "tertiaire" | "operationnelle";
      field: string;
      from: unknown;
      to: unknown;
      label: string;
    };

const ZONE_COMPARE_FIELDS: (keyof Zone)[] = ["nom_zone", "batiment", "capacite_max", "type"];
const TERT_COMPARE_FIELDS: (keyof AffectationTertiaire)[] = ["nom", "prenom", "service", "statut", "zone_id", "date_debut", "date_fin", "change_reason"];
const OP_COMPARE_FIELDS: (keyof AffectationOperationnelle)[] = ["nom_projet", "surface_necessaire", "zone_id", "date_debut", "date_fin"];

function labelForTertiaire(a: AffectationTertiaire): string {
  return `${a.prenom} ${a.nom}`;
}

function labelForOperationnelle(a: AffectationOperationnelle): string {
  return a.nom_projet;
}

export function computeDiff(nominal: AppData, current: AppData): Diff[] {
  const diffs: Diff[] = [];

  // --- Zones ---
  const nominalZoneMap = new Map(nominal.zones.map((z) => [z.id, z]));
  const currentZoneMap = new Map(current.zones.map((z) => [z.id, z]));

  for (const [id, zone] of currentZoneMap) {
    const nom = nominalZoneMap.get(id);
    if (!nom) {
      diffs.push({ type: "zone_added", zoneId: id, data: zone });
    } else {
      for (const field of ZONE_COMPARE_FIELDS) {
        if (JSON.stringify(nom[field]) !== JSON.stringify(zone[field])) {
          diffs.push({
            type: "zone_updated",
            zoneId: id,
            field,
            from: nom[field],
            to: zone[field],
            zoneName: zone.nom_zone,
          });
        }
      }
    }
  }

  for (const [id, zone] of nominalZoneMap) {
    if (!currentZoneMap.has(id)) {
      diffs.push({ type: "zone_removed", zoneId: id, data: zone });
    }
  }

  // --- Affectations Tertiaires ---
  const nomTertMap = new Map(nominal.affectationsTertiaires.map((a) => [a.id, a]));
  const curTertMap = new Map(current.affectationsTertiaires.map((a) => [a.id, a]));

  for (const [id, aff] of curTertMap) {
    const nom = nomTertMap.get(id);
    if (!nom) {
      diffs.push({ type: "affectation_added", affectationId: id, entity: "tertiaire", data: aff });
    } else {
      for (const field of TERT_COMPARE_FIELDS) {
        if (JSON.stringify(nom[field]) !== JSON.stringify(aff[field])) {
          diffs.push({
            type: "affectation_updated",
            affectationId: id,
            entity: "tertiaire",
            field,
            from: nom[field],
            to: aff[field],
            label: labelForTertiaire(aff),
          });
        }
      }
    }
  }

  for (const [id, aff] of nomTertMap) {
    if (!curTertMap.has(id)) {
      diffs.push({ type: "affectation_removed", affectationId: id, entity: "tertiaire", data: aff });
    }
  }

  // --- Affectations Operationnelles ---
  const nomOpMap = new Map(nominal.affectationsOperationnelles.map((a) => [a.id, a]));
  const curOpMap = new Map(current.affectationsOperationnelles.map((a) => [a.id, a]));

  for (const [id, aff] of curOpMap) {
    const nom = nomOpMap.get(id);
    if (!nom) {
      diffs.push({ type: "affectation_added", affectationId: id, entity: "operationnelle", data: aff });
    } else {
      for (const field of OP_COMPARE_FIELDS) {
        if (JSON.stringify(nom[field]) !== JSON.stringify(aff[field])) {
          diffs.push({
            type: "affectation_updated",
            affectationId: id,
            entity: "operationnelle",
            field,
            from: nom[field],
            to: aff[field],
            label: labelForOperationnelle(aff),
          });
        }
      }
    }
  }

  for (const [id, aff] of nomOpMap) {
    if (!curOpMap.has(id)) {
      diffs.push({ type: "affectation_removed", affectationId: id, entity: "operationnelle", data: aff });
    }
  }

  return diffs;
}

/** Set of zone IDs that have any diff */
export function modifiedZoneIds(diffs: Diff[]): Set<string> {
  const ids = new Set<string>();
  for (const d of diffs) {
    if (d.type === "zone_added" || d.type === "zone_removed" || d.type === "zone_updated") {
      ids.add(d.zoneId);
    }
    if (d.type === "affectation_added" || d.type === "affectation_removed" || d.type === "affectation_updated") {
      const data = "data" in d ? d.data : null;
      if (data && "zone_id" in data && data.zone_id) {
        ids.add(data.zone_id);
      }
    }
  }
  return ids;
}
