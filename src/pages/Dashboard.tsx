import React, { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { DatePicker } from "@/components/DatePicker";
import { StatCard } from "@/components/StatCard";
import { ZoneCard } from "@/components/ZoneCard";
import { ZoneTypeFilter, ZoneFilterType } from "@/components/ZoneTypeFilter";
import { BuildingSummary } from "@/components/BuildingSummary";
import { Building2, Users, Maximize, TrendingUp, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const Dashboard: React.FC = () => {
  const {
    zones,
    dateEtat,
    setDateEtat,
    getOccupationForZone,
    getBatiments,
  } = useApp();

  const [filter, setFilter] = useState<ZoneFilterType>("all");
  const [openBatiments, setOpenBatiments] = useState<Set<string>>(new Set());

  const batiments = getBatiments();

  // Stats globales (toujours sur toutes les zones)
  const stats = useMemo(() => {
    const tertiaires = zones.filter((z) => z.type === "tertiaire");
    const operationnelles = zones.filter((z) => z.type === "operationnelle");

    let totalPersonnes = 0;
    let capacitePersonnes = 0;
    let totalSurface = 0;
    let capaciteSurface = 0;

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
      totalPersonnes,
      capacitePersonnes,
      totalSurface,
      capaciteSurface,
      tauxTertiaire,
      tauxOperationnel,
      batiments: batiments.length,
    };
  }, [zones, dateEtat, getOccupationForZone, batiments]);

  // Zones filtrées et groupées par bâtiment (trié alphabétiquement)
  const zonesByBatiment = useMemo(() => {
    const filteredZones = filter === "all" 
      ? zones 
      : zones.filter((z) => z.type === filter);

    const grouped: Record<string, typeof zones> = {};
    
    filteredZones.forEach((zone) => {
      if (!grouped[zone.batiment]) {
        grouped[zone.batiment] = [];
      }
      grouped[zone.batiment].push(zone);
    });

    // Trier les zones par type puis par nom alphabétique
    Object.keys(grouped).forEach((batiment) => {
      grouped[batiment].sort((a, b) => {
        // D'abord par type (tertiaire avant opérationnelle)
        if (a.type !== b.type) {
          return a.type === "tertiaire" ? -1 : 1;
        }
        // Puis par nom alphabétique
        return a.nom_zone.localeCompare(b.nom_zone, "fr");
      });
    });

    return grouped;
  }, [zones, filter]);

  // Bâtiments triés alphabétiquement
  const sortedBatiments = useMemo(() => {
    return Object.keys(zonesByBatiment).sort((a, b) => a.localeCompare(b, "fr"));
  }, [zonesByBatiment]);

  // Calcul des stats par bâtiment
  const getBatimentStats = (batiment: string) => {
    const batimentZones = zones.filter((z) => z.batiment === batiment);
    const tertiaires = batimentZones.filter((z) => z.type === "tertiaire");
    const operationnelles = batimentZones.filter((z) => z.type === "operationnelle");

    let occTertiaire = 0, capTertiaire = 0;
    let occOperationnelle = 0, capOperationnelle = 0;

    tertiaires.forEach((zone) => {
      const occ = getOccupationForZone(zone.id, dateEtat);
      occTertiaire += occ.occupation;
      capTertiaire += occ.capacite_max;
    });

    operationnelles.forEach((zone) => {
      const occ = getOccupationForZone(zone.id, dateEtat);
      occOperationnelle += occ.occupation;
      capOperationnelle += occ.capacite_max;
    });

    const tauxTertiaire = capTertiaire > 0 ? (occTertiaire / capTertiaire) * 100 : 0;
    const tauxOperationnel = capOperationnelle > 0 ? (occOperationnelle / capOperationnelle) * 100 : 0;

    let tauxMoyen = 0;
    let count = 0;
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
      if (next.has(batiment)) {
        next.delete(batiment);
      } else {
        next.add(batiment);
      }
      return next;
    });
  };

  // Grouper les zones par type à l'intérieur d'un bâtiment
  const getZonesGroupedByType = (batimentZones: typeof zones) => {
    const tertiaires = batimentZones.filter((z) => z.type === "tertiaire");
    const operationnelles = batimentZones.filter((z) => z.type === "operationnelle");
    return { tertiaires, operationnelles };
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble du site au {format(dateEtat, "d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <DatePicker
          date={dateEtat}
          onDateChange={setDateEtat}
          label="Date d'état :"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Zones totales"
          value={stats.totalZones}
          subtitle={`${stats.batiments} bâtiment${stats.batiments > 1 ? "s" : ""}`}
          icon={Building2}
          variant="primary"
        />
        <StatCard
          title="Occupation tertiaire"
          value={`${stats.totalPersonnes} / ${stats.capacitePersonnes}`}
          subtitle="personnes"
          icon={Users}
          variant={stats.tauxTertiaire > 80 ? "warning" : "success"}
        />
        <StatCard
          title="Occupation opérationnelle"
          value={`${stats.totalSurface} / ${stats.capaciteSurface}`}
          subtitle="m² utilisés"
          icon={Maximize}
          variant={stats.tauxOperationnel > 80 ? "warning" : "success"}
        />
        <StatCard
          title="Taux moyen"
          value={`${Math.round((stats.tauxTertiaire + stats.tauxOperationnel) / 2)}%`}
          subtitle="d'occupation globale"
          icon={TrendingUp}
        />
      </div>

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
            {filter === "all" 
              ? "Commencez par créer des zones dans la section \"Zones\""
              : "Aucune zone ne correspond à ce filtre"}
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
              <Collapsible
                key={batiment}
                open={isOpen}
                onOpenChange={() => toggleBatiment(batiment)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:bg-accent/50 transition-colors">
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                    <div className="flex-1">
                      <BuildingSummary
                        batiment={batiment}
                        zonesCount={batimentStats.zonesCount}
                        occupationTertiaire={batimentStats.occupationTertiaire}
                        occupationOperationnelle={batimentStats.occupationOperationnelle}
                        tauxMoyen={batimentStats.tauxMoyen}
                      />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-3 pl-8 space-y-4">
                    {/* Zones tertiaires */}
                    {tertiaires.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Tertiaire ({tertiaires.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {tertiaires.map((zone) => (
                            <ZoneCard
                              key={zone.id}
                              zone={zone}
                              stats={getOccupationForZone(zone.id, dateEtat)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Zones opérationnelles */}
                    {operationnelles.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Maximize className="w-4 h-4" />
                          Opérationnel ({operationnelles.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {operationnelles.map((zone) => (
                            <ZoneCard
                              key={zone.id}
                              zone={zone}
                              stats={getOccupationForZone(zone.id, dateEtat)}
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
  );
};

export default Dashboard;
