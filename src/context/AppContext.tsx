import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Zone,
  AffectationTertiaire,
  AffectationOperationnelle,
  AppData,
  OccupationStats,
  Scenario,
} from "@/types";
import { saveBuildingPlan, compressImage, getAllBuildingPlanKeys } from "@/lib/buildingPlanDB";

const STORAGE_KEY = "site-management-data";
const SCENARIOS_KEY = "site-management-scenarios";

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
  
  // Building plans (IndexedDB)
  buildingPlanKeys: Set<string>;
  planRevision: number;
  uploadBuildingPlan: (batiment: string, file: File) => Promise<void>;
  
  // Import/Export
  exportData: () => AppData;
  importData: (data: AppData) => void;

  // Scenarios
  scenarios: Scenario[];
  activeScenario: Scenario | null;
  createScenario: (nom: string) => void;
  deleteScenario: (id: string) => void;
  activateScenario: (id: string) => void;
  saveActiveScenario: () => void;
  discardActiveScenario: () => void;
  promoteActiveScenario: () => void;
  promoteScenario: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateId = () => crypto.randomUUID();

const defaultData: AppData = {
  zones: [],
  affectationsTertiaires: [],
  affectationsOperationnelles: [],
};

// Sanitize zone_id: convert "INCONNUE" to undefined
const sanitizeZoneId = (zoneId?: string): string | undefined => {
  if (!zoneId || zoneId === "INCONNUE") return undefined;
  return zoneId;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [affectationsTertiaires, setAffectationsTertiaires] = useState<AffectationTertiaire[]>([]);
  const [affectationsOperationnelles, setAffectationsOperationnelles] = useState<AffectationOperationnelle[]>([]);
  const [dateEtat, setDateEtat] = useState<Date>(new Date());
  const [buildingPlanKeys, setBuildingPlanKeys] = useState<Set<string>>(new Set());
  const [planRevision, setPlanRevision] = useState(0);

  // Scenario state
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  // Store nominal data while scenario is active
  const [nominalData, setNominalData] = useState<AppData | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: AppData = JSON.parse(stored);
        const cleanedZones = (data.zones || []).filter(
          (z) => z.nom_zone.toLowerCase() !== "inconnue"
        );
        setZones(cleanedZones);
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

    // Load scenarios
    const storedScenarios = localStorage.getItem(SCENARIOS_KEY);
    if (storedScenarios) {
      try {
        setScenarios(JSON.parse(storedScenarios));
      } catch (e) {
        console.error("Error parsing scenarios:", e);
      }
    }
    
    getAllBuildingPlanKeys().then((keys) => {
      setBuildingPlanKeys(new Set(keys));
    });

    const oldPlansKey = "site-management-building-plans";
    if (localStorage.getItem(oldPlansKey)) {
      localStorage.removeItem(oldPlansKey);
    }
  }, []);

  // Save nominal data to localStorage (only when no scenario is active)
  useEffect(() => {
    if (activeScenario) return; // Don't persist scenario data as nominal
    const data: AppData = {
      zones,
      affectationsTertiaires,
      affectationsOperationnelles,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [zones, affectationsTertiaires, affectationsOperationnelles, activeScenario]);

  // Save scenarios list to localStorage
  useEffect(() => {
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
  }, [scenarios]);

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
        const active = affectationsTertiaires.filter(
          (a) => a.zone_id === zoneId && isActiveAtDate(a.date_debut, a.date_fin, date)
        );
        const unique = new Set(active.map((a) => `${a.nom.trim().toLowerCase()}|${a.prenom.trim().toLowerCase()}`));
        occupation = unique.size;
      } else {
        const active = affectationsOperationnelles.filter(
          (a) => a.zone_id === zoneId && isActiveAtDate(a.date_debut, a.date_fin, date)
        );
        const byProject = new Map<string, number>();
        active.forEach((a) => {
          const key = a.nom_projet.trim().toLowerCase();
          const existing = byProject.get(key) || 0;
          byProject.set(key, Math.max(existing, a.surface_necessaire));
        });
        byProject.forEach((v) => (occupation += v));
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

  const uploadBuildingPlan = useCallback(async (batiment: string, file: File) => {
    const blob = await compressImage(file);
    await saveBuildingPlan(batiment, blob);
    setBuildingPlanKeys((prev) => new Set(prev).add(batiment));
    setPlanRevision((r) => r + 1);
  }, []);

  const exportData = useCallback((): AppData => {
    return { zones, affectationsTertiaires, affectationsOperationnelles };
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

  // === Scenario management ===

  const createScenario = useCallback((nom: string) => {
    const currentData: AppData = {
      zones: structuredClone(zones),
      affectationsTertiaires: structuredClone(affectationsTertiaires),
      affectationsOperationnelles: structuredClone(affectationsOperationnelles),
    };
    const scenario: Scenario = {
      id: generateId(),
      nom,
      dateCreation: new Date().toISOString(),
      data: currentData,
    };
    // Save nominal and switch to scenario data
    setNominalData(currentData);
    setActiveScenario(scenario);
    // The working data is already the current data (deep cloned into scenario)
  }, [zones, affectationsTertiaires, affectationsOperationnelles]);

  const deleteScenario = useCallback((id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const activateScenario = useCallback((id: string) => {
    const scenario = scenarios.find((s) => s.id === id);
    if (!scenario) return;
    // Save current nominal
    setNominalData({
      zones: structuredClone(zones),
      affectationsTertiaires: structuredClone(affectationsTertiaires),
      affectationsOperationnelles: structuredClone(affectationsOperationnelles),
    });
    // Load scenario data into working state
    const data = structuredClone(scenario.data);
    setZones(data.zones);
    setAffectationsTertiaires(data.affectationsTertiaires);
    setAffectationsOperationnelles(data.affectationsOperationnelles);
    setActiveScenario({ ...scenario });
    // Remove from saved list (it's now active)
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }, [scenarios, zones, affectationsTertiaires, affectationsOperationnelles]);

  const restoreNominal = useCallback(() => {
    if (!nominalData) return;
    setZones(nominalData.zones);
    setAffectationsTertiaires(nominalData.affectationsTertiaires);
    setAffectationsOperationnelles(nominalData.affectationsOperationnelles);
    setNominalData(null);
    setActiveScenario(null);
  }, [nominalData]);

  const saveActiveScenario = useCallback(() => {
    if (!activeScenario) return;
    // Save current working state into the scenario
    const savedScenario: Scenario = {
      ...activeScenario,
      data: {
        zones: structuredClone(zones),
        affectationsTertiaires: structuredClone(affectationsTertiaires),
        affectationsOperationnelles: structuredClone(affectationsOperationnelles),
      },
    };
    setScenarios((prev) => [...prev, savedScenario]);
    restoreNominal();
  }, [activeScenario, zones, affectationsTertiaires, affectationsOperationnelles, restoreNominal]);

  const discardActiveScenario = useCallback(() => {
    restoreNominal();
  }, [restoreNominal]);

  const promoteActiveScenario = useCallback(() => {
    if (!activeScenario) return;
    // Current working state IS the scenario data — just keep it and discard nominal
    setNominalData(null);
    setActiveScenario(null);
    // Data already in state, will be persisted via useEffect
  }, [activeScenario]);

  const promoteScenario = useCallback((id: string) => {
    const scenario = scenarios.find((s) => s.id === id);
    if (!scenario) return;
    const data = structuredClone(scenario.data);
    setZones(data.zones);
    setAffectationsTertiaires(data.affectationsTertiaires);
    setAffectationsOperationnelles(data.affectationsOperationnelles);
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }, [scenarios]);

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
        buildingPlanKeys,
        planRevision,
        uploadBuildingPlan,
        exportData,
        importData,
        scenarios,
        activeScenario,
        createScenario,
        deleteScenario,
        activateScenario,
        saveActiveScenario,
        discardActiveScenario,
        promoteActiveScenario,
        promoteScenario,
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
