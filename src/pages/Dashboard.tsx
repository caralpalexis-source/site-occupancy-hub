import React, { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { DatePicker } from "@/components/DatePicker";
import { StatCard } from "@/components/StatCard";
import { ZoneCard } from "@/components/ZoneCard";
import { Building2, Users, Maximize, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const Dashboard: React.FC = () => {
  const {
    zones,
    dateEtat,
    setDateEtat,
    getOccupationForZone,
    getBatiments,
  } = useApp();

  const batiments = getBatiments();

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

  const zonesByBatiment = useMemo(() => {
    const grouped: Record<string, typeof zones> = {};
    zones.forEach((zone) => {
      if (!grouped[zone.batiment]) {
        grouped[zone.batiment] = [];
      }
      grouped[zone.batiment].push(zone);
    });
    return grouped;
  }, [zones]);

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

      {/* Zones by Building */}
      {Object.keys(zonesByBatiment).length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Aucune zone configurée
          </h3>
          <p className="text-muted-foreground">
            Commencez par créer des zones dans la section "Zones"
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(zonesByBatiment).map(([batiment, batimentZones]) => (
            <div key={batiment}>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                {batiment}
                <span className="text-sm font-normal text-muted-foreground">
                  ({batimentZones.length} zone{batimentZones.length > 1 ? "s" : ""})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {batimentZones.map((zone) => (
                  <ZoneCard
                    key={zone.id}
                    zone={zone}
                    stats={getOccupationForZone(zone.id, dateEtat)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
