export type ZoneType = "tertiaire" | "operationnelle";

export interface Zone {
  id: string;
  type: ZoneType;
  batiment: string;
  nom_zone: string;
  capacite_max: number; // personnes si tertiaire, m² si opérationnelle
  image_plan?: string;
}

export interface AffectationTertiaire {
  id: string;
  nom: string;
  prenom: string;
  service: string;
  zone_id: string;
  date_debut: string;
  date_fin?: string;
}

export interface AffectationOperationnelle {
  id: string;
  nom_projet: string;
  surface_necessaire: number;
  zone_id: string;
  date_debut: string;
  date_fin?: string;
}

export interface AppData {
  zones: Zone[];
  affectationsTertiaires: AffectationTertiaire[];
  affectationsOperationnelles: AffectationOperationnelle[];
}

export interface OccupationStats {
  occupation: number;
  capacite_max: number;
  taux: number;
}
