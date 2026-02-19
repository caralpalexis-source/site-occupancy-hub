import React, { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Zone, AffectationTertiaire, AffectationOperationnelle } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CalendarRange } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, addMonths, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

const TIMELINE_COLORS = [
  "hsl(210, 70%, 50%)",
  "hsl(340, 70%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(45, 80%, 50%)",
  "hsl(270, 60%, 55%)",
  "hsl(20, 75%, 50%)",
  "hsl(180, 55%, 45%)",
  "hsl(300, 50%, 55%)",
  "hsl(100, 50%, 45%)",
  "hsl(0, 60%, 50%)",
];

interface TimelineBar {
  label: string;
  start: Date;
  end: Date;
  colorIndex: number;
}

interface ZoneTimeline {
  zone: Zone;
  bars: TimelineBar[];
}

function isOverlapping(
  dateDebut: string,
  dateFin: string | undefined,
  windowStart: Date,
  windowEnd: Date
): boolean {
  const debut = new Date(dateDebut);
  debut.setHours(0, 0, 0, 0);
  const fin = dateFin ? new Date(dateFin) : windowEnd;
  return debut <= windowEnd && fin >= windowStart;
}

export const TimelineView: React.FC = () => {
  const {
    zones,
    affectationsTertiaires,
    affectationsOperationnelles,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [selectedBatiment, setSelectedBatiment] = useState<string>("__all__");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("__all__");

  const batiments = useMemo(
    () =>
      [...new Set(zones.map((z) => z.batiment))].sort((a, b) =>
        a.localeCompare(b, "fr", { numeric: true })
      ),
    [zones]
  );

  const filteredZones = useMemo(() => {
    let list = zones;
    if (selectedZoneId !== "__all__") {
      list = zones.filter((z) => z.id === selectedZoneId);
    } else if (selectedBatiment !== "__all__") {
      list = zones.filter((z) => z.batiment === selectedBatiment);
    }
    return [...list].sort((a, b) =>
      a.nom_zone.localeCompare(b.nom_zone, "fr", { numeric: true })
    );
  }, [zones, selectedBatiment, selectedZoneId]);

  const windowStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const windowEnd = useMemo(() => addMonths(windowStart, 24), [windowStart]);
  const totalDays = differenceInDays(windowEnd, windowStart);

  const zoneTimelines = useMemo<ZoneTimeline[]>(() => {
    return filteredZones.map((zone) => {
      const bars: TimelineBar[] = [];
      let colorIdx = 0;

      if (zone.type === "tertiaire") {
        const affs = affectationsTertiaires.filter(
          (a) =>
            a.zone_id === zone.id &&
            isOverlapping(a.date_debut, a.date_fin, windowStart, windowEnd)
        );
        affs.forEach((a) => {
          bars.push({
            label: `${a.prenom} ${a.nom}`,
            start: new Date(a.date_debut) < windowStart ? windowStart : new Date(a.date_debut),
            end: a.date_fin
              ? new Date(a.date_fin) > windowEnd
                ? windowEnd
                : new Date(a.date_fin)
              : windowEnd,
            colorIndex: colorIdx++,
          });
        });
      } else {
        const affs = affectationsOperationnelles.filter(
          (a) =>
            a.zone_id === zone.id &&
            isOverlapping(a.date_debut, a.date_fin, windowStart, windowEnd)
        );
        affs.forEach((a) => {
          bars.push({
            label: a.nom_projet,
            start: new Date(a.date_debut) < windowStart ? windowStart : new Date(a.date_debut),
            end: a.date_fin
              ? new Date(a.date_fin) > windowEnd
                ? windowEnd
                : new Date(a.date_fin)
              : windowEnd,
            colorIndex: colorIdx++,
          });
        });
      }

      return { zone, bars };
    });
  }, [filteredZones, affectationsTertiaires, affectationsOperationnelles, windowStart, windowEnd]);

  // Generate month markers
  const monthMarkers = useMemo(() => {
    const markers: { label: string; offsetPercent: number }[] = [];
    let current = new Date(windowStart);
    current.setDate(1);
    current = addMonths(current, 1);

    while (current <= windowEnd) {
      const days = differenceInDays(current, windowStart);
      markers.push({
        label: format(current, "MMM yy", { locale: fr }),
        offsetPercent: (days / totalDays) * 100,
      });
      current = addMonths(current, 1);
    }
    return markers;
  }, [windowStart, windowEnd, totalDays]);

  const handleBatimentChange = (val: string) => {
    setSelectedBatiment(val);
    setSelectedZoneId("__all__");
  };

  const zonesForSelect = useMemo(() => {
    let list = zones;
    if (selectedBatiment !== "__all__") {
      list = zones.filter((z) => z.batiment === selectedBatiment);
    }
    return [...list].sort((a, b) =>
      a.nom_zone.localeCompare(b.nom_zone, "fr", { numeric: true })
    );
  }, [zones, selectedBatiment]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarRange className="w-4 h-4 mr-2" />
          Timeline
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Timeline des mouvements — 24 mois</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Bâtiment</Label>
            <Select value={selectedBatiment} onValueChange={handleBatimentChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous les bâtiments</SelectItem>
                {batiments.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Zone</Label>
            <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes les zones</SelectItem>
                {zonesForSelect.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.batiment} — {z.nom_zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground ml-auto">
            {format(windowStart, "d MMM yyyy", { locale: fr })} → {format(windowEnd, "d MMM yyyy", { locale: fr })}
          </p>
        </div>

        <ScrollArea className="flex-1 mt-4">
          {zoneTimelines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune zone à afficher
            </div>
          ) : (
            <div className="space-y-6 pr-4">
              {zoneTimelines.map(({ zone, bars }) => (
                <div key={zone.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {zone.batiment}
                    </span>
                    <span className="font-semibold text-sm text-foreground">
                      {zone.nom_zone}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({zone.type === "tertiaire" ? `${zone.capacite_max} pers.` : `${zone.capacite_max} m²`})
                    </span>
                  </div>

                  {/* Timeline track */}
                  <div className="relative bg-muted/40 rounded border border-border min-h-[40px]">
                    {/* Month grid lines */}
                    {monthMarkers.map((m, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-border/50"
                        style={{ left: `${m.offsetPercent}%` }}
                      >
                        <span className="absolute -top-4 left-0.5 text-[9px] text-muted-foreground whitespace-nowrap">
                          {m.label}
                        </span>
                      </div>
                    ))}

                    {bars.length === 0 ? (
                      <div className="flex items-center justify-center h-10 text-xs text-muted-foreground italic">
                        Aucune affectation
                      </div>
                    ) : (
                      <div className="space-y-0.5 py-1 pt-1">
                        {bars.map((bar, i) => {
                          const startDays = differenceInDays(bar.start, windowStart);
                          const barDays = differenceInDays(bar.end, bar.start);
                          const leftPercent = Math.max(0, (startDays / totalDays) * 100);
                          const widthPercent = Math.max(0.5, (barDays / totalDays) * 100);

                          return (
                            <TooltipProvider key={i}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="relative h-7 rounded-sm flex items-center px-1.5 overflow-hidden cursor-default"
                                    style={{
                                      marginLeft: `${leftPercent}%`,
                                      width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
                                      backgroundColor: TIMELINE_COLORS[bar.colorIndex % TIMELINE_COLORS.length],
                                    }}
                                  >
                                    <span className="text-[10px] font-medium text-white truncate">
                                      {bar.label}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">{bar.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(bar.start, "d MMM yyyy", { locale: fr })} → {format(bar.end, "d MMM yyyy", { locale: fr })}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
