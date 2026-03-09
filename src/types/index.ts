export type ZoneType = "tertiaire" | "operationnelle";

export interface Zone {
  id: string;
  type: ZoneType;
  batiment: string;
  nom_zone: string;
  capacite_max: number; // personnes si tertiaire, m² si opérationnelle
  image_plan?: string;
}

export const STATUTS_TERTIAIRE = ["Titulaire", "Prestataire", "Intérimaire", "Alternant"] as const;
export type StatutTertiaire = typeof STATUTS_TERTIAIRE[number];

export const CHANGE_REASONS = [
  "Mutation interne",
  "Réorganisation d'équipe",
  "Nouvelle arrivée",
  "Départ",
  "Correction administrative",
] as const;
export type ChangeReason = typeof CHANGE_REASONS[number];

export interface AffectationTertiaire {
  id: string;
  nom: string;
  prenom: string;
  service: string;
  statut?: StatutTertiaire;
  zone_id?: string;
  date_debut: string;
  date_fin?: string;
  change_reason?: string;
}

export interface AffectationOperationnelle {
  id: string;
  nom_projet: string;
  surface_necessaire: number;
  zone_id?: string;
  date_debut: string;
  date_fin?: string;
}

export interface AppData {
  zones: Zone[];
  affectationsTertiaires: AffectationTertiaire[];
  affectationsOperationnelles: AffectationOperationnelle[];
}

export interface Scenario {
  id: string;
  nom: string;
  dateCreation: string;
  data: AppData;
}

export interface OccupationStats {
  occupation: number;
  capacite_max: number;
  taux: number;
}
