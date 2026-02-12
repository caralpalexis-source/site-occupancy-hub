import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Zone,
  AffectationTertiaire,
  AffectationOperationnelle,
  AppData,
  OccupationStats,
} from "@/types";

const STORAGE_KEY = "site-management-data";
const BUILDING_PLANS_KEY = "site-management-building-plans";

interface AppContextType {
  zones: Zone[];
  affectationsTertiaires: AffectationTertiaire[];
  affectationsOperationnelles: AffectationOperationnelle[];
  dateEtat: Date;
  setDateEtat: (date: Date) => void;
  
  // Zone CRUD
  addZone: (zone: Omit<Zone, "id">) => void;
  updateZone: (zone: Zone) => void;
  deleteZone: (id: string) => void;
  
  // Affectation Tertiaire CRUD
  addAffectationTertiaire: (aff: Omit<AffectationTertiaire, "id">) => void;
  updateAffectationTertiaire: (aff: AffectationTertiaire) => void;
  deleteAffectationTertiaire: (id: string) => void;
  
  // Affectation Operationnelle CRUD
  addAffectationOperationnelle: (aff: Omit<AffectationOperationnelle, "id">) => void;
  updateAffectationOperationnelle: (aff: AffectationOperationnelle) => void;
  deleteAffectationOperationnelle: (id: string) => void;
  
  // Calculs
  getOccupationForZone: (zoneId: string, date: Date) => OccupationStats;
  getBatiments: () => string[];
  
  // Building plans
  buildingPlans: Record<string, string>;
  setBuildingPlan: (batiment: string, imageData: string) => void;
  
  // Import/Export
  exportData: () => AppData;
  importData: (data: AppData) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateId = () => crypto.randomUUID();

const defaultData: AppData = {
  zones: [],
  affectationsTertiaires: [],
  affectationsOperationnelles: [],
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [affectationsTertiaires, setAffectationsTertiaires] = useState<AffectationTertiaire[]>([]);
  const [affectationsOperationnelles, setAffectationsOperationnelles] = useState<AffectationOperationnelle[]>([]);
  const [dateEtat, setDateEtat] = useState<Date>(new Date());
  const [buildingPlans, setBuildingPlans] = useState<Record<string, string>>({});

  // Sanitize zone_id: convert "INCONNUE" to undefined
  const sanitizeZoneId = (zoneId?: string): string | undefined => {
    if (!zoneId || zoneId === "INCONNUE") return undefined;
    return zoneId;
  };

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: AppData = JSON.parse(stored);
        // Remove any zone named "INCONNUE"
        const cleanedZones = (data.zones || []).filter(
          (z) => z.nom_zone.toLowerCase() !== "inconnue"
        );
        setZones(cleanedZones);
        // Clean up any "INCONNUE" zone_id values and remove references to deleted INCONNUE zones
        const inconnueZoneIds = new Set(
          (data.zones || []).filter((z) => z.nom_zone.toLowerCase() === "inconnue").map((z) => z.id)
        );
        setAffectationsTertiaires(
          (data.affectationsTertiaires || []).map((a) => ({
            ...a,
            zone_id: inconnueZoneIds.has(a.zone_id || "") ? undefined : sanitizeZoneId(a.zone_id),
          }))
        );
        setAffectationsOperationnelles(
          (data.affectationsOperationnelles || []).map((a) => ({
            ...a,
            zone_id: inconnueZoneIds.has(a.zone_id || "") ? undefined : sanitizeZoneId(a.zone_id),
          }))
        );
      } catch (e) {
        console.error("Error parsing stored data:", e);
      }
    }
    
    // Load building plans separately
    const storedPlans = localStorage.getItem(BUILDING_PLANS_KEY);
    if (storedPlans) {
      try {
        setBuildingPlans(JSON.parse(storedPlans));
      } catch (e) {
        console.error("Error parsing building plans:", e);
      }
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    const data: AppData = {
      zones,
      affectationsTertiaires,
      affectationsOperationnelles,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [zones, affectationsTertiaires, affectationsOperationnelles]);

  // Zone CRUD
  const addZone = useCallback((zone: Omit<Zone, "id">) => {
    setZones((prev) => [...prev, { ...zone, id: generateId() }]);
  }, []);

  const updateZone = useCallback((zone: Zone) => {
    setZones((prev) => prev.map((z) => (z.id === zone.id ? zone : z)));
  }, []);

  const deleteZone = useCallback((id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    setAffectationsTertiaires((prev) => prev.filter((a) => a.zone_id !== id));
    setAffectationsOperationnelles((prev) => prev.filter((a) => a.zone_id !== id));
  }, []);

  // Affectation Tertiaire CRUD
  const addAffectationTertiaire = useCallback((aff: Omit<AffectationTertiaire, "id">) => {
    setAffectationsTertiaires((prev) => [...prev, { ...aff, id: generateId() }]);
  }, []);

  const updateAffectationTertiaire = useCallback((aff: AffectationTertiaire) => {
    setAffectationsTertiaires((prev) => prev.map((a) => (a.id === aff.id ? aff : a)));
  }, []);

  const deleteAffectationTertiaire = useCallback((id: string) => {
    setAffectationsTertiaires((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Affectation Operationnelle CRUD
  const addAffectationOperationnelle = useCallback((aff: Omit<AffectationOperationnelle, "id">) => {
    setAffectationsOperationnelles((prev) => [...prev, { ...aff, id: generateId() }]);
  }, []);

  const updateAffectationOperationnelle = useCallback((aff: AffectationOperationnelle) => {
    setAffectationsOperationnelles((prev) => prev.map((a) => (a.id === aff.id ? aff : a)));
  }, []);

  const deleteAffectationOperationnelle = useCallback((id: string) => {
    setAffectationsOperationnelles((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Calcul d'occupation
  const isActiveAtDate = (dateDebut: string, dateFin: string | undefined, date: Date): boolean => {
    const debut = new Date(dateDebut);
    debut.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    if (debut > checkDate) return false;
    if (!dateFin) return true;
    
    const fin = new Date(dateFin);
    fin.setHours(23, 59, 59, 999);
    return fin >= checkDate;
  };

  const getOccupationForZone = useCallback(
    (zoneId: string, date: Date): OccupationStats => {
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone) return { occupation: 0, capacite_max: 0, taux: 0 };

      let occupation = 0;

      if (zone.type === "tertiaire") {
        occupation = affectationsTertiaires.filter(
          (a) => a.zone_id === zoneId && isActiveAtDate(a.date_debut, a.date_fin, date)
        ).length;
      } else {
        occupation = affectationsOperationnelles
          .filter((a) => a.zone_id === zoneId && isActiveAtDate(a.date_debut, a.date_fin, date))
          .reduce((sum, a) => sum + a.surface_necessaire, 0);
      }

      const taux = zone.capacite_max > 0 ? (occupation / zone.capacite_max) * 100 : 0;

      return {
        occupation,
        capacite_max: zone.capacite_max,
        taux: Math.min(taux, 100),
      };
    },
    [zones, affectationsTertiaires, affectationsOperationnelles]
  );

  const getBatiments = useCallback(() => {
    return [...new Set(zones.map((z) => z.batiment))];
  }, [zones]);

  const setBuildingPlan = useCallback((batiment: string, imageData: string) => {
    setBuildingPlans((prev) => {
      const updated = { ...prev, [batiment]: imageData };
      localStorage.setItem(BUILDING_PLANS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const exportData = useCallback((): AppData => {
    return {
      zones,
      affectationsTertiaires,
      affectationsOperationnelles,
    };
  }, [zones, affectationsTertiaires, affectationsOperationnelles]);

  const importData = useCallback((data: AppData) => {
    if (data.zones) setZones(data.zones);
    if (data.affectationsTertiaires) setAffectationsTertiaires(
      data.affectationsTertiaires.map((a) => ({ ...a, zone_id: sanitizeZoneId(a.zone_id) }))
    );
    if (data.affectationsOperationnelles) setAffectationsOperationnelles(
      data.affectationsOperationnelles.map((a) => ({ ...a, zone_id: sanitizeZoneId(a.zone_id) }))
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        zones,
        affectationsTertiaires,
        affectationsOperationnelles,
        dateEtat,
        setDateEtat,
        addZone,
        updateZone,
        deleteZone,
        addAffectationTertiaire,
        updateAffectationTertiaire,
        deleteAffectationTertiaire,
        addAffectationOperationnelle,
        updateAffectationOperationnelle,
        deleteAffectationOperationnelle,
        getOccupationForZone,
        getBatiments,
        buildingPlans,
        setBuildingPlan,
        exportData,
        importData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
