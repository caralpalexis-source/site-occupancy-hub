import React, { useMemo, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { DatePicker } from "@/components/DatePicker";
import { StatCard } from "@/components/StatCard";
import { DroppableZoneCard } from "@/components/DroppableZoneCard";
import { DragOverlayContent } from "@/components/DragOverlayContent";
import { ZoneTypeFilter, ZoneFilterType } from "@/components/ZoneTypeFilter";
import { BuildingSummary } from "@/components/BuildingSummary";
import { BuildingPlanUpload } from "@/components/BuildingPlanUpload";
import { BuildingServicePieChart } from "@/components/BuildingServicePieChart";
import { Building2, Users, Maximize, TrendingUp, ChevronDown, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { AffectationOperationnelle, AffectationTertiaire } from "@/types";
import { useDoubleAffectations } from "@/hooks/useDoubleAffectations";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ActiveDragState {
  type: "operationnelle" | "tertiaire";
  affectation?: AffectationOperationnelle;
  affectationTertiaire?: AffectationTertiaire;
}

const Dashboard: React.FC = () => {
  const {
    zones,
    affectationsTertiaires,
    affectationsOperationnelles,
    dateEtat,
    setDateEtat,
    getOccupationForZone,
    getBatiments,
    changeAffectationTertiaireZone,
    changeAffectationOperationnelleZone,
  } = useApp();

  const [filter, setFilter] = useState<ZoneFilterType>("all");
  const [openBatiments, setOpenBatiments] = useState<Set<string>>(new Set());
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);

  const doubles = useDoubleAffectations(affectationsTertiaires, affectationsOperationnelles, dateEtat);
  const totalDoubles = doubles.totalTertiaires + doubles.totalOperationnelles;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const batiments = getBatiments();

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

  // --- DnD handlers ---
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "tertiaire" && data?.affectationTertiaire) {
      setActiveDrag({ type: "tertiaire", affectationTertiaire: data.affectationTertiaire });
    } else if (data?.affectation) {
      setActiveDrag({ type: "operationnelle", affectation: data.affectation });
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDrag(null);
      const { active, over } = event;
      if (!over) return;

      const targetZone = over.data.current?.zone;
      if (!targetZone) return;

      const data = active.data.current;

      // --- Handle tertiaire ---
      if (data?.type === "tertiaire") {
        const aff = data.affectationTertiaire as AffectationTertiaire;
        if (!aff) return;

        const result = changeAffectationTertiaireZone(aff.id, targetZone.id, dateEtat);
        if (!result.success) {
          if (result.error === "same_zone") return;
          toast({ title: "Déplacement impossible", description: result.error, variant: "destructive" });
          return;
        }
        if (result.warning) {
          toast({ title: `⚠️ ${result.warning}` });
        }
        toast({
          title: `Ressource déplacée vers ${targetZone.nom_zone}`,
          description: `${aff.prenom} ${aff.nom} à partir du ${format(dateEtat, "dd/MM/yyyy")}`,
        });
        return;
      }

      // --- Handle operationnelle ---
      const affectation = data?.affectation as AffectationOperationnelle | undefined;
      if (!affectation) return;

      const result = changeAffectationOperationnelleZone(affectation.id, targetZone.id, dateEtat);
      if (!result.success) {
        if (result.error === "same_zone") return;
        toast({ title: "Déplacement impossible", description: result.error, variant: "destructive" });
        return;
      }
      if (result.warning) {
        toast({ title: `⚠️ ${result.warning}` });
      }
      toast({
        title: `Ressource déplacée vers ${targetZone.nom_zone}`,
        description: `${affectation.nom_projet} à partir du ${format(dateEtat, "dd/MM/yyyy")}`,
      });
    },
    [changeAffectationTertiaireZone, changeAffectationOperationnelleZone, dateEtat]
  );

  // --- Stats ---
  const stats = useMemo(() => {
    const tertiaires = zones.filter((z) => z.type === "tertiaire");
    const operationnelles = zones.filter((z) => z.type === "operationnelle");
    let totalPersonnes = 0, capacitePersonnes = 0, totalSurface = 0, capaciteSurface = 0;
    tertiaires.forEach((zone) => {
      const occ = getOccupationForZone(zone.id, dateEtat);
      totalPersonnes += occ.occupation;
      capacitePersonnes += occ.capacite_max;
    });
    operationnelles.forEach((zone) => {
      const occ = getOccupationForZone(zone.id, dateEtat);
      totalSurface += occ.occupation;
      capaciteSurface += occ.capacite_max;
    });
    const tauxTertiaire = capacitePersonnes > 0 ? (totalPersonnes / capacitePersonnes) * 100 : 0;
    const tauxOperationnel = capaciteSurface > 0 ? (totalSurface / capaciteSurface) * 100 : 0;
    return {
      totalZones: zones.length,
      totalPersonnes, capacitePersonnes,
      totalSurface, capaciteSurface,
      tauxTertiaire, tauxOperationnel,
      batiments: batiments.length,
    };
  }, [zones, dateEtat, getOccupationForZone, batiments]);

  const zonesByBatiment = useMemo(() => {
    const filteredZones = filter === "all" ? zones : zones.filter((z) => z.type === filter);
    const grouped: Record<string, typeof zones> = {};
    filteredZones.forEach((zone) => {
      if (!grouped[zone.batiment]) grouped[zone.batiment] = [];
      grouped[zone.batiment].push(zone);
    });
    Object.keys(grouped).forEach((batiment) => {
      grouped[batiment].sort((a, b) => {
        if (a.type !== b.type) return a.type === "tertiaire" ? -1 : 1;
        return a.nom_zone.localeCompare(b.nom_zone, "fr");
      });
    });
    return grouped;
  }, [zones, filter]);

  const sortedBatiments = useMemo(() => {
    return Object.keys(zonesByBatiment).sort((a, b) => a.localeCompare(b, "fr"));
  }, [zonesByBatiment]);

  const overCapacityZoneIds = useMemo(() => {
    const ids = new Set<string>();
    zones.forEach((zone) => {
      const s = getOccupationForZone(zone.id, dateEtat);
      if (s.occupation > s.capacite_max) ids.add(zone.id);
    });
    return ids;
  }, [zones, dateEtat, getOccupationForZone, affectationsOperationnelles, affectationsTertiaires]);

  const getBatimentStats = (batiment: string) => {
    const batimentZones = zones.filter((z) => z.batiment === batiment);
    const tertiaires = batimentZones.filter((z) => z.type === "tertiaire");
    const operationnelles = batimentZones.filter((z) => z.type === "operationnelle");
    let occTertiaire = 0, capTertiaire = 0, occOperationnelle = 0, capOperationnelle = 0;
    tertiaires.forEach((zone) => {
      const occ = getOccupationForZone(zone.id, dateEtat);
      occTertiaire += occ.occupation; capTertiaire += occ.capacite_max;
    });
    operationnelles.forEach((zone) => {
      const occ = getOccupationForZone(zone.id, dateEtat);
      occOperationnelle += occ.occupation; capOperationnelle += occ.capacite_max;
    });
    const tauxTertiaire = capTertiaire > 0 ? (occTertiaire / capTertiaire) * 100 : 0;
    const tauxOperationnel = capOperationnelle > 0 ? (occOperationnelle / capOperationnelle) * 100 : 0;
    let tauxMoyen = 0, count = 0;
    if (capTertiaire > 0) { tauxMoyen += tauxTertiaire; count++; }
    if (capOperationnelle > 0) { tauxMoyen += tauxOperationnel; count++; }
    tauxMoyen = count > 0 ? tauxMoyen / count : 0;
    return {
      zonesCount: batimentZones.length,
      occupationTertiaire: { current: occTertiaire, max: capTertiaire },
      occupationOperationnelle: { current: occOperationnelle, max: capOperationnelle },
      tauxMoyen,
    };
  };

  const toggleBatiment = (batiment: string) => {
    setOpenBatiments((prev) => {
      const next = new Set(prev);
      if (next.has(batiment)) next.delete(batiment);
      else next.add(batiment);
      return next;
    });
  };

  const getZonesGroupedByType = (batimentZones: typeof zones) => {
    const tertiaires = batimentZones.filter((z) => z.type === "tertiaire");
    const operationnelles = batimentZones.filter((z) => z.type === "operationnelle");
    return { tertiaires, operationnelles };
  };

  const getActiveAffectationsTertiaires = (zoneId: string) => {
    return affectationsTertiaires.filter(
      (a) => a.zone_id === zoneId && isActiveAtDate(a.date_debut, a.date_fin, dateEtat)
    );
  };

  const getActiveAffectationsOperationnelles = (zoneId: string) => {
    return affectationsOperationnelles.filter(
      (a) => a.zone_id === zoneId && isActiveAtDate(a.date_debut, a.date_fin, dateEtat)
    );
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
            <p className="text-muted-foreground">
              Vue d'ensemble du site au {format(dateEtat, "d MMMM yyyy", { locale: fr })}
            </p>
          </div>
          <DatePicker date={dateEtat} onDateChange={setDateEtat} label="Date d'état :" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Zones totales" value={stats.totalZones} subtitle={`${stats.batiments} bâtiment${stats.batiments > 1 ? "s" : ""}`} icon={Building2} variant="primary" />
          <StatCard title="Occupation tertiaire" value={`${stats.totalPersonnes} / ${stats.capacitePersonnes}`} subtitle="personnes" icon={Users} variant={stats.tauxTertiaire > 80 ? "warning" : "success"} />
          <StatCard title="Occupation opérationnelle" value={`${stats.totalSurface} / ${stats.capaciteSurface}`} subtitle="m² utilisés" icon={Maximize} variant={stats.tauxOperationnel > 80 ? "warning" : "success"} />
          <StatCard title="Taux moyen" value={`${Math.round((stats.tauxTertiaire + stats.tauxOperationnel) / 2)}%`} subtitle="d'occupation globale" icon={TrendingUp} />
        </div>

        {/* Double affectation warning */}
        {totalDoubles > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Double affectation détectée</AlertTitle>
            <AlertDescription>
              ⚠️ {totalDoubles} ressource{totalDoubles > 1 ? "s" : ""} possède{totalDoubles > 1 ? "nt" : ""} plusieurs affectations actives à la date sélectionnée.
              {doubles.totalTertiaires > 0 && (
                <span className="block text-xs mt-1">
                  Tertiaire : {doubles.tertiaires.map((d) => `${d.prenom} ${d.nom} (${d.count}×)`).join(", ")}
                </span>
              )}
              {doubles.totalOperationnelles > 0 && (
                <span className="block text-xs mt-1">
                  Opérationnel : {doubles.operationnelles.map((d) => `${d.nom_projet} (${d.count}×)`).join(", ")}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Filter */}
        <div className="mb-6">
          <ZoneTypeFilter value={filter} onChange={setFilter} />
        </div>

        {/* Zones by Building */}
        {sortedBatiments.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {filter === "all" ? "Aucune zone configurée" : `Aucune zone ${filter === "tertiaire" ? "tertiaire" : "opérationnelle"}`}
            </h3>
            <p className="text-muted-foreground">
              {filter === "all" ? 'Commencez par créer des zones dans la section "Zones"' : "Aucune zone ne correspond à ce filtre"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedBatiments.map((batiment) => {
              const batimentStats = getBatimentStats(batiment);
              const isOpen = openBatiments.has(batiment);
              const batimentZones = zonesByBatiment[batiment];
              const { tertiaires, operationnelles } = getZonesGroupedByType(batimentZones);

              return (
                <Collapsible key={batiment} open={isOpen} onOpenChange={() => toggleBatiment(batiment)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                      <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                      <div className="flex-1">
                        <BuildingSummary batiment={batiment} zonesCount={batimentStats.zonesCount} occupationTertiaire={batimentStats.occupationTertiaire} occupationOperationnelle={batimentStats.occupationOperationnelle} tauxMoyen={batimentStats.tauxMoyen} />
                      </div>
                      <BuildingServicePieChart
                        batiment={batiment}
                        affectations={affectationsTertiaires}
                        zones={zones}
                        dateEtat={dateEtat}
                      />
                      <BuildingPlanUpload batiment={batiment} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-3 pl-8 space-y-4">
                      {tertiaires.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Tertiaire ({tertiaires.length})
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {tertiaires.map((zone) => (
                              <DroppableZoneCard
                                key={zone.id}
                                zone={zone}
                                stats={getOccupationForZone(zone.id, dateEtat)}
                                affectationsTertiaires={getActiveAffectationsTertiaires(zone.id)}
                                affectationsOperationnelles={[]}
                                isOverCapacity={overCapacityZoneIds.has(zone.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {operationnelles.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <Maximize className="w-4 h-4" /> Opérationnel ({operationnelles.length})
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {operationnelles.map((zone) => (
                              <DroppableZoneCard
                                key={zone.id}
                                zone={zone}
                                stats={getOccupationForZone(zone.id, dateEtat)}
                                affectationsTertiaires={[]}
                                affectationsOperationnelles={getActiveAffectationsOperationnelles(zone.id)}
                                isOverCapacity={overCapacityZoneIds.has(zone.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeDrag?.type === "operationnelle" ? (
          <DragOverlayContent affectation={activeDrag.affectation} />
        ) : activeDrag?.type === "tertiaire" ? (
          <DragOverlayContent affectationTertiaire={activeDrag.affectationTertiaire} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default Dashboard;
