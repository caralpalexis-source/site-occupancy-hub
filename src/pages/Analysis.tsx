import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { DatePicker } from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  Search,
  AlertTriangle,
  TrendingDown,
  Activity,
  Lightbulb,
  Building2,
  CheckCircle,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, eachDayOfInterval, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Zone } from "@/types";
import { toast } from "@/components/ui/sonner";

const Analysis: React.FC = () => {
  const {
    zones,
    affectationsTertiaires,
    affectationsOperationnelles,
    getBatiments,
    getOccupationForZone,
    addAffectationOperationnelle,
  } = useApp();

  // Period selection
  const [dateDebut, setDateDebut] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const [dateFin, setDateFin] = useState<Date>(new Date());

  // Collapsible states
  const [openEmpty, setOpenEmpty] = useState(false);
  const [openUnderused, setOpenUnderused] = useState(false);
  const [openSaturated, setOpenSaturated] = useState(false);

  // Availability analysis dialog
  const [showAvailability, setShowAvailability] = useState(false);
  const [availProjectName, setAvailProjectName] = useState("");
  const [availSurface, setAvailSurface] = useState("");
  const [availDateDebut, setAvailDateDebut] = useState<Date>(new Date());
  const [availDateFin, setAvailDateFin] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d;
  });
  const [availResults, setAvailResults] = useState<
    { zone: Zone; durationMonths: number }[] | null
  >(null);
  const [assignedZoneIds, setAssignedZoneIds] = useState<Set<string>>(new Set());

  // Scenario analysis dialog
  const [showScenario, setShowScenario] = useState(false);
  const [scenarioBatiment, setScenarioBatiment] = useState<string>("");
  const [scenarioZones, setScenarioZones] = useState<Set<string>>(new Set());
  const [scenarioAllZones, setScenarioAllZones] = useState(false);
  const [scenarioDateDebut, setScenarioDateDebut] = useState<Date>(new Date());
  const [scenarioDateFin, setScenarioDateFin] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d;
  });
  const [scenarioResults, setScenarioResults] = useState<{
    personnesSansZone: number;
    projetsNonReplacables: number;
    totalPersonnesImpactees: number;
    totalProjetsImpactes: number;
  } | null>(null);

  const batiments = getBatiments();

  // Helper: check if affectation is active at a given date
  const isActiveAtDate = (
    dateDebutAff: string,
    dateFinAff: string | undefined,
    date: Date
  ): boolean => {
    const debut = new Date(dateDebutAff);
    debut.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (debut > checkDate) return false;
    if (!dateFinAff) return true;

    const fin = new Date(dateFinAff);
    fin.setHours(23, 59, 59, 999);
    return fin >= checkDate;
  };

  // Calculate occupation for a zone at a specific date
  const getOccupationAtDate = (zone: Zone, date: Date): number => {
    if (zone.type === "tertiaire") {
      return affectationsTertiaires.filter(
        (a) => a.zone_id === zone.id && isActiveAtDate(a.date_debut, a.date_fin, date)
      ).length;
    } else {
      return affectationsOperationnelles
        .filter(
          (a) => a.zone_id === zone.id && isActiveAtDate(a.date_debut, a.date_fin, date)
        )
        .reduce((sum, a) => sum + a.surface_necessaire, 0);
    }
  };

  // Calculate average occupation rate over a period
  const getAverageOccupationRate = (zone: Zone, start: Date, end: Date): number => {
    const days = eachDayOfInterval({ start, end });
    if (days.length === 0) return 0;

    let totalRate = 0;
    days.forEach((day) => {
      const occupation = getOccupationAtDate(zone, day);
      const rate =
        zone.capacite_max > 0 ? (occupation / zone.capacite_max) * 100 : 0;
      totalRate += rate;
    });

    return totalRate / days.length;
  };

  // Calculate duration where rate is below/above threshold
  const getDurationWithCondition = (
    zone: Zone,
    start: Date,
    end: Date,
    condition: (rate: number) => boolean
  ): number => {
    const days = eachDayOfInterval({ start, end });
    let count = 0;
    days.forEach((day) => {
      const occupation = getOccupationAtDate(zone, day);
      const rate =
        zone.capacite_max > 0 ? (occupation / zone.capacite_max) * 100 : 0;
      if (condition(rate)) count++;
    });
    return count;
  };

  // Zone analysis data
  const zoneAnalysis = useMemo(() => {
    const empty: { zone: Zone; avgRate: number; daysEmpty: number }[] = [];
    const underused: { zone: Zone; avgRate: number; daysUnderused: number }[] = [];
    const saturated: { zone: Zone; avgRate: number; daysSaturated: number }[] = [];

    zones.forEach((zone) => {
      const avgRate = getAverageOccupationRate(zone, dateDebut, dateFin);

      if (avgRate < 10) {
        const daysEmpty = getDurationWithCondition(
          zone,
          dateDebut,
          dateFin,
          (r) => r < 10
        );
        empty.push({ zone, avgRate, daysEmpty });
      } else if (avgRate >= 10 && avgRate < 30) {
        const daysUnderused = getDurationWithCondition(
          zone,
          dateDebut,
          dateFin,
          (r) => r < 30
        );
        underused.push({ zone, avgRate, daysUnderused });
      }

      if (avgRate > 90) {
        const daysSaturated = getDurationWithCondition(
          zone,
          dateDebut,
          dateFin,
          (r) => r > 90
        );
        saturated.push({ zone, avgRate, daysSaturated });
      }
    });

    // Group by building
    const groupByBuilding = <T extends { zone: Zone }>(items: T[]) => {
      const grouped: Record<string, T[]> = {};
      items.forEach((item) => {
        if (!grouped[item.zone.batiment]) {
          grouped[item.zone.batiment] = [];
        }
        grouped[item.zone.batiment].push(item);
      });
      return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0], "fr"));
    };

    return {
      empty: groupByBuilding(empty),
      underused: groupByBuilding(underused),
      saturated: groupByBuilding(saturated),
      emptyCount: empty.length,
      underusedCount: underused.length,
      saturatedCount: saturated.length,
    };
  }, [zones, dateDebut, dateFin, affectationsTertiaires, affectationsOperationnelles]);

  // Availability analysis
  const runAvailabilityAnalysis = () => {
    const surfaceNeeded = parseFloat(availSurface);
    if (isNaN(surfaceNeeded) || surfaceNeeded <= 0) return;

    const compatible: { zone: Zone; durationMonths: number }[] = [];

    // Only operational zones
    const operationalZones = zones.filter((z) => z.type === "operationnelle");

    operationalZones.forEach((zone) => {
      if (zone.capacite_max < surfaceNeeded) return;

      // Check availability for each day in the period
      const days = eachDayOfInterval({ start: availDateDebut, end: availDateFin });
      let allDaysAvailable = true;

      for (const day of days) {
        const occupation = getOccupationAtDate(zone, day);
        const available = zone.capacite_max - occupation;
        if (available < surfaceNeeded) {
          allDaysAvailable = false;
          break;
        }
      }

      if (allDaysAvailable) {
        const months = differenceInDays(availDateFin, availDateDebut) / 30;
        compatible.push({ zone, durationMonths: Math.round(months) });
      }
    });

    setAvailResults(compatible);
  };

  // Helper: check if affectation overlaps with a closure period (independent from global analysis period)
  const overlapsWithClosure = (
    affDateDebut: string,
    affDateFin: string | undefined,
    closureStart: Date,
    closureEnd: Date
  ): boolean => {
    const affStart = new Date(affDateDebut);
    affStart.setHours(0, 0, 0, 0);
    
    const closureStartNorm = new Date(closureStart);
    closureStartNorm.setHours(0, 0, 0, 0);
    
    const closureEndNorm = new Date(closureEnd);
    closureEndNorm.setHours(23, 59, 59, 999);
    
    // affectation.date_debut <= fermeture.date_fin
    if (affStart > closureEndNorm) return false;
    
    // AND (affectation.date_fin is empty OR affectation.date_fin >= fermeture.date_debut)
    if (!affDateFin) return true;
    
    const affEnd = new Date(affDateFin);
    affEnd.setHours(23, 59, 59, 999);
    
    return affEnd >= closureStartNorm;
  };

  // Handle direct assignment from availability results
  const handleAssignToZone = (zone: Zone) => {
    if (!availProjectName.trim() || !availSurface) return;

    const surfaceNeeded = parseFloat(availSurface);
    const dateDebutStr = format(availDateDebut, "yyyy-MM-dd");
    const dateFinStr = format(availDateFin, "yyyy-MM-dd");

    addAffectationOperationnelle({
      nom_projet: availProjectName.trim(),
      surface_necessaire: surfaceNeeded,
      zone_id: zone.id,
      date_debut: dateDebutStr,
      date_fin: dateFinStr,
    });

    setAssignedZoneIds((prev) => new Set(prev).add(zone.id));
    toast.success(`Projet "${availProjectName}" affecté à ${zone.nom_zone}`);
  };

  // Reset assigned zones when dialog closes
  const handleAvailabilityClose = (open: boolean) => {
    setShowAvailability(open);
    if (!open) {
      setAssignedZoneIds(new Set());
      setAvailResults(null);
    }
  };

  // Scenario analysis
  const runScenarioAnalysis = () => {
    if (!scenarioBatiment) return;

    const batimentZones = zones.filter((z) => z.batiment === scenarioBatiment);
    const unavailableZoneIds = scenarioAllZones
      ? batimentZones.map((z) => z.id)
      : Array.from(scenarioZones);

    let personnesSansZone = 0;
    let projetsNonReplacables = 0;

    // Find affected tertiary assignments - using overlap with closure period (NOT global analysis period)
    const affectedTertiaire = affectationsTertiaires.filter(
      (a) =>
        unavailableZoneIds.includes(a.zone_id) &&
        overlapsWithClosure(a.date_debut, a.date_fin, scenarioDateDebut, scenarioDateFin)
    );

    // Check if they can be relocated
    affectedTertiaire.forEach((aff) => {
      const otherZones = zones.filter(
        (z) =>
          z.type === "tertiaire" &&
          !unavailableZoneIds.includes(z.id)
      );

      let canRelocate = false;
      for (const zone of otherZones) {
        const days = eachDayOfInterval({
          start: scenarioDateDebut,
          end: scenarioDateFin,
        });
        const hasCapacity = days.every((day) => {
          const occ = getOccupationAtDate(zone, day);
          return occ < zone.capacite_max;
        });
        if (hasCapacity) {
          canRelocate = true;
          break;
        }
      }

      if (!canRelocate) personnesSansZone++;
    });

    // Find affected operational assignments - using overlap with closure period (NOT global analysis period)
    const affectedOperationnelle = affectationsOperationnelles.filter(
      (a) =>
        unavailableZoneIds.includes(a.zone_id) &&
        overlapsWithClosure(a.date_debut, a.date_fin, scenarioDateDebut, scenarioDateFin)
    );

    affectedOperationnelle.forEach((aff) => {
      const otherZones = zones.filter(
        (z) =>
          z.type === "operationnelle" &&
          !unavailableZoneIds.includes(z.id)
      );

      let canRelocate = false;
      for (const zone of otherZones) {
        if (zone.capacite_max < aff.surface_necessaire) continue;

        const days = eachDayOfInterval({
          start: scenarioDateDebut,
          end: scenarioDateFin,
        });
        const hasCapacity = days.every((day) => {
          const occ = getOccupationAtDate(zone, day);
          return zone.capacite_max - occ >= aff.surface_necessaire;
        });
        if (hasCapacity) {
          canRelocate = true;
          break;
        }
      }

      if (!canRelocate) projetsNonReplacables++;
    });

    setScenarioResults({ 
      personnesSansZone, 
      projetsNonReplacables,
      totalPersonnesImpactees: affectedTertiaire.length,
      totalProjetsImpactes: affectedOperationnelle.length,
    });
  };

  const scenarioBatimentZones = useMemo(() => {
    if (!scenarioBatiment) return [];
    return zones.filter((z) => z.batiment === scenarioBatiment);
  }, [scenarioBatiment, zones]);

  const totalPeriodDays = differenceInDays(dateFin, dateDebut) + 1;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Analyse</h1>
        <p className="text-muted-foreground">
          Outils d'aide à la décision pour la gestion des surfaces
        </p>
      </div>

      {/* Period Selection */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Période d'analyse</CardTitle>
          <CardDescription>
            Sélectionnez la période sur laquelle effectuer l'analyse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <DatePicker
              date={dateDebut}
              onDateChange={setDateDebut}
              label="Du"
            />
            <DatePicker date={dateFin} onDateChange={setDateFin} label="Au" />
            <span className="text-sm text-muted-foreground">
              ({totalPeriodDays} jours)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Zone Analysis */}
      <div className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-foreground">
          Synthèse des zones
        </h2>

        {/* Empty zones */}
        <Collapsible open={openEmpty} onOpenChange={setOpenEmpty}>
          <CollapsibleTrigger className="w-full">
            <Card
              className={cn(
                "transition-colors",
                openEmpty && "border-destructive/50"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="text-left">
                      <CardTitle className="text-base">
                        Zones quasi-vides
                      </CardTitle>
                      <CardDescription>
                        Taux moyen d'occupation {"<"} 10%
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-destructive">
                      {zoneAnalysis.emptyCount}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform",
                        openEmpty && "rotate-180"
                      )}
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-4 bg-card border border-border rounded-lg">
              {zoneAnalysis.empty.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune zone quasi-vide sur cette période
                </p>
              ) : (
                <div className="space-y-4">
                  {zoneAnalysis.empty.map(([batiment, items]) => (
                    <div key={batiment}>
                      <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {batiment}
                      </h4>
                      <div className="space-y-2 pl-6">
                        {items.map(({ zone, avgRate, daysEmpty }) => (
                          <div
                            key={zone.id}
                            className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded"
                          >
                            <span className="font-medium">{zone.nom_zone}</span>
                            <span className="text-muted-foreground">
                              {daysEmpty} jours (taux moyen:{" "}
                              {Math.round(avgRate)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Underused zones */}
        <Collapsible open={openUnderused} onOpenChange={setOpenUnderused}>
          <CollapsibleTrigger className="w-full">
            <Card
              className={cn(
                "transition-colors",
                openUnderused && "border-yellow-500/50"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="text-left">
                      <CardTitle className="text-base">
                        Zones sous-utilisées
                      </CardTitle>
                      <CardDescription>
                        Taux moyen d'occupation entre 10% et 30%
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-yellow-600">
                      {zoneAnalysis.underusedCount}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform",
                        openUnderused && "rotate-180"
                      )}
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-4 bg-card border border-border rounded-lg">
              {zoneAnalysis.underused.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune zone sous-utilisée sur cette période
                </p>
              ) : (
                <div className="space-y-4">
                  {zoneAnalysis.underused.map(([batiment, items]) => (
                    <div key={batiment}>
                      <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {batiment}
                      </h4>
                      <div className="space-y-2 pl-6">
                        {items.map(({ zone, avgRate, daysUnderused }) => (
                          <div
                            key={zone.id}
                            className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded"
                          >
                            <span className="font-medium">{zone.nom_zone}</span>
                            <span className="text-muted-foreground">
                              {daysUnderused} jours {"<"} 30% (taux moyen:{" "}
                              {Math.round(avgRate)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Saturated zones */}
        <Collapsible open={openSaturated} onOpenChange={setOpenSaturated}>
          <CollapsibleTrigger className="w-full">
            <Card
              className={cn(
                "transition-colors",
                openSaturated && "border-primary/50"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <CardTitle className="text-base">
                        Zones en saturation
                      </CardTitle>
                      <CardDescription>
                        Taux moyen d'occupation {">"} 90%
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-primary">
                      {zoneAnalysis.saturatedCount}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform",
                        openSaturated && "rotate-180"
                      )}
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-4 bg-card border border-border rounded-lg">
              {zoneAnalysis.saturated.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune zone en saturation sur cette période
                </p>
              ) : (
                <div className="space-y-4">
                  {zoneAnalysis.saturated.map(([batiment, items]) => (
                    <div key={batiment}>
                      <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {batiment}
                      </h4>
                      <div className="space-y-2 pl-6">
                        {items.map(({ zone, avgRate, daysSaturated }) => (
                          <div
                            key={zone.id}
                            className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded"
                          >
                            <span className="font-medium">{zone.nom_zone}</span>
                            <span className="text-muted-foreground">
                              {daysSaturated} jours {">"} 90% (taux moyen:{" "}
                              {Math.round(avgRate)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Analysis Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setShowAvailability(true)}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">
                  Analyse de disponibilité
                </CardTitle>
                <CardDescription>
                  Rechercher des zones compatibles pour un projet
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setShowScenario(true)}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-base">Analyse de scénario</CardTitle>
                <CardDescription>
                  Simuler l'indisponibilité de zones
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Availability Dialog */}
      <Dialog open={showAvailability} onOpenChange={handleAvailabilityClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Analyse de disponibilité</DialogTitle>
            <DialogDescription>
              Recherchez des zones opérationnelles compatibles avec vos besoins
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du projet</Label>
              <Input
                value={availProjectName}
                onChange={(e) => setAvailProjectName(e.target.value)}
                placeholder="Ex: Projet XYZ"
              />
            </div>
            <div className="space-y-2">
              <Label>Surface nécessaire (m²)</Label>
              <Input
                type="number"
                value={availSurface}
                onChange={(e) => setAvailSurface(e.target.value)}
                placeholder="Ex: 150"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <DatePicker
                  date={availDateDebut}
                  onDateChange={setAvailDateDebut}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de fin</Label>
                <DatePicker
                  date={availDateFin}
                  onDateChange={setAvailDateFin}
                />
              </div>
            </div>

            {availResults !== null && (
              <div className="p-4 bg-muted rounded-lg">
                {availResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune zone compatible trouvée
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      {availResults.length} zone{availResults.length > 1 ? "s" : ""}{" "}
                      compatible{availResults.length > 1 ? "s" : ""} trouvée
                      {availResults.length > 1 ? "s" : ""}
                    </p>
                    <div className="space-y-2">
                      {availResults.map(({ zone, durationMonths }) => (
                        <div
                          key={zone.id}
                          className="text-sm flex items-center justify-between gap-2 p-2 bg-background rounded border"
                        >
                          <div className="flex-1">
                            <span className="font-medium">
                              {zone.nom_zone} ({zone.batiment})
                            </span>
                            <span className="text-muted-foreground ml-2">
                              – dispo {durationMonths} mois
                            </span>
                          </div>
                          {assignedZoneIds.has(zone.id) ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs">Affecté</span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssignToZone(zone)}
                              disabled={!availProjectName.trim()}
                              className="gap-1"
                            >
                              <PlusCircle className="w-3 h-3" />
                              Affecter
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleAvailabilityClose(false)}>
              Fermer
            </Button>
            <Button onClick={runAvailabilityAnalysis}>Rechercher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scenario Dialog */}
      <Dialog open={showScenario} onOpenChange={setShowScenario}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Analyse de scénario</DialogTitle>
            <DialogDescription>
              Simulez l'indisponibilité de zones pour évaluer l'impact
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bâtiment</Label>
              <Select
                value={scenarioBatiment}
                onValueChange={(v) => {
                  setScenarioBatiment(v);
                  setScenarioZones(new Set());
                  setScenarioAllZones(false);
                  setScenarioResults(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un bâtiment" />
                </SelectTrigger>
                <SelectContent>
                  {batiments.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {scenarioBatiment && (
              <div className="space-y-2">
                <Label>Zones indisponibles</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all-zones"
                      checked={scenarioAllZones}
                      onCheckedChange={(checked) => {
                        setScenarioAllZones(!!checked);
                        if (checked) {
                          setScenarioZones(
                            new Set(scenarioBatimentZones.map((z) => z.id))
                          );
                        } else {
                          setScenarioZones(new Set());
                        }
                      }}
                    />
                    <label
                      htmlFor="all-zones"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Toutes les zones
                    </label>
                  </div>
                  {scenarioBatimentZones.map((zone) => (
                    <div key={zone.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={zone.id}
                        checked={scenarioZones.has(zone.id)}
                        disabled={scenarioAllZones}
                        onCheckedChange={(checked) => {
                          const next = new Set(scenarioZones);
                          if (checked) {
                            next.add(zone.id);
                          } else {
                            next.delete(zone.id);
                          }
                          setScenarioZones(next);
                        }}
                      />
                      <label
                        htmlFor={zone.id}
                        className="text-sm cursor-pointer"
                      >
                        {zone.nom_zone} ({zone.type === "tertiaire" ? "Tertiaire" : "Opérationnel"})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <DatePicker
                  date={scenarioDateDebut}
                  onDateChange={setScenarioDateDebut}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de fin</Label>
                <DatePicker
                  date={scenarioDateFin}
                  onDateChange={setScenarioDateFin}
                />
              </div>
            </div>

            {scenarioResults !== null && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium text-orange-600 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Impact estimé
                </p>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    Affectations impactées : {scenarioResults.totalPersonnesImpactees} personne{scenarioResults.totalPersonnesImpactees > 1 ? "s" : ""} / {scenarioResults.totalProjetsImpactes} projet{scenarioResults.totalProjetsImpactes > 1 ? "s" : ""}
                  </p>
                  <p className="font-medium">
                    – {scenarioResults.personnesSansZone} personne
                    {scenarioResults.personnesSansZone > 1 ? "s" : ""} sans zone de repli
                  </p>
                  <p className="font-medium">
                    – {scenarioResults.projetsNonReplacables} projet
                    {scenarioResults.projetsNonReplacables > 1 ? "s" : ""} non
                    replaçable{scenarioResults.projetsNonReplacables > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScenario(false)}>
              Fermer
            </Button>
            <Button
              onClick={runScenarioAnalysis}
              disabled={!scenarioBatiment || scenarioZones.size === 0}
            >
              Analyser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Analysis;
