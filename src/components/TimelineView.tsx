import React, { useMemo, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { Zone } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CalendarRange } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { format, addMonths, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";

const ZOOM_OPTIONS = [1, 3, 6, 12, 24] as const;
type ZoomLevel = (typeof ZOOM_OPTIONS)[number];

/** Deterministic HSL color from a string key */
function stableColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}

interface TimelineBar {
  label: string;
  resourceKey: string;
  start: Date;
  end: Date;
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
  const { zones, affectationsTertiaires, affectationsOperationnelles } = useApp();

  const [open, setOpen] = useState(false);
  const [selectedBatiments, setSelectedBatiments] = useState<string[]>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState<ZoomLevel>(24);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        const allBats = [...new Set(zones.map((z) => z.batiment))];
        setSelectedBatiments(allBats);
        setSelectedZoneIds(zones.map((z) => z.id));
        setZoom(24);
      }
    },
    [zones]
  );

  const batimentOptions = useMemo(
    () =>
      [...new Set(zones.map((z) => z.batiment))]
        .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
        .map((b) => ({ value: b, label: b })),
    [zones]
  );

  const zoneOptions = useMemo(() => {
    return zones
      .filter((z) => selectedBatiments.includes(z.batiment))
      .sort((a, b) => a.nom_zone.localeCompare(b.nom_zone, "fr", { numeric: true }))
      .map((z) => ({ value: z.id, label: `${z.batiment} — ${z.nom_zone}` }));
  }, [zones, selectedBatiments]);

  const handleBatimentsChange = useCallback(
    (newBatiments: string[]) => {
      setSelectedBatiments(newBatiments);
      setSelectedZoneIds((prev) => {
        const validZoneIds = new Set(
          zones.filter((z) => newBatiments.includes(z.batiment)).map((z) => z.id)
        );
        return prev.filter((id) => validZoneIds.has(id));
      });
    },
    [zones]
  );

  const filteredZones = useMemo(() => {
    return zones
      .filter((z) => selectedZoneIds.includes(z.id))
      .sort((a, b) => a.nom_zone.localeCompare(b.nom_zone, "fr", { numeric: true }));
  }, [zones, selectedZoneIds]);

  const windowStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const windowEnd = useMemo(() => addMonths(windowStart, zoom), [windowStart, zoom]);
  const totalDays = differenceInDays(windowEnd, windowStart);

  const zoneTimelines = useMemo<ZoneTimeline[]>(() => {
    return filteredZones.map((zone) => {
      const bars: TimelineBar[] = [];

      if (zone.type === "tertiaire") {
        affectationsTertiaires
          .filter(
            (a) =>
              a.zone_id === zone.id &&
              isOverlapping(a.date_debut, a.date_fin, windowStart, windowEnd)
          )
          .forEach((a) => {
            const key = `${a.nom}|${a.prenom}`;
            bars.push({
              label: `${a.prenom} ${a.nom}`,
              resourceKey: key,
              start: new Date(a.date_debut) < windowStart ? windowStart : new Date(a.date_debut),
              end: a.date_fin
                ? new Date(a.date_fin) > windowEnd
                  ? windowEnd
                  : new Date(a.date_fin)
                : windowEnd,
            });
          });
      } else {
        affectationsOperationnelles
          .filter(
            (a) =>
              a.zone_id === zone.id &&
              isOverlapping(a.date_debut, a.date_fin, windowStart, windowEnd)
          )
          .forEach((a) => {
            bars.push({
              label: a.nom_projet,
              resourceKey: a.nom_projet,
              start: new Date(a.date_debut) < windowStart ? windowStart : new Date(a.date_debut),
              end: a.date_fin
                ? new Date(a.date_fin) > windowEnd
                  ? windowEnd
                  : new Date(a.date_fin)
                : windowEnd,
            });
          });
      }

      return { zone, bars };
    });
  }, [filteredZones, affectationsTertiaires, affectationsOperationnelles, windowStart, windowEnd]);

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

  const filtersActive =
    selectedBatiments.length < batimentOptions.length ||
    selectedZoneIds.length < zoneOptions.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarRange className="w-4 h-4 mr-2" />
          Timeline
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[95vw] h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            Timeline des mouvements — {zoom} mois
            {filtersActive && (
              <Badge variant="secondary" className="text-[10px]">
                Filtres actifs
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Filters + Zoom */}
        <div className="flex flex-wrap gap-4 items-end flex-shrink-0">
          <div className="space-y-1.5">
            <Label className="text-xs">Bâtiments</Label>
            <MultiSelectDropdown
              options={batimentOptions}
              selected={selectedBatiments}
              onChange={handleBatimentsChange}
              placeholder="Sélectionner..."
              allLabel="Tous les bâtiments"
              className="w-[200px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Zones</Label>
            <MultiSelectDropdown
              options={zoneOptions}
              selected={selectedZoneIds}
              onChange={setSelectedZoneIds}
              placeholder="Sélectionner..."
              allLabel="Toutes les zones"
              emptyLabel="Aucune zone disponible"
              className="w-[240px]"
            />
          </div>

          {/* Zoom buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs">Zoom</Label>
            <div className="flex gap-1">
              {ZOOM_OPTIONS.map((z) => (
                <Button
                  key={z}
                  size="sm"
                  variant={zoom === z ? "default" : "outline"}
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setZoom(z)}
                >
                  {z}m
                </Button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground ml-auto">
            {format(windowStart, "d MMM yyyy", { locale: fr })} →{" "}
            {format(windowEnd, "d MMM yyyy", { locale: fr })}
          </p>
        </div>

        <div className="flex-1 min-h-0 mt-4 overflow-y-auto">
          {zoneTimelines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {selectedZoneIds.length === 0 ? "Aucune zone sélectionnée" : "Aucune zone à afficher"}
            </div>
          ) : (
            <div className="space-y-6 pr-4">
              {zoneTimelines.map(({ zone, bars }) => (
                <div key={zone.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {zone.batiment}
                    </span>
                    <span className="font-semibold text-sm text-foreground">{zone.nom_zone}</span>
                    <span className="text-xs text-muted-foreground">
                      ({zone.type === "tertiaire" ? `${zone.capacite_max} pers.` : `${zone.capacite_max} m²`})
                    </span>
                  </div>

                  <div className="relative bg-muted/40 rounded border border-border min-h-[40px]">
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
                                      backgroundColor: stableColor(bar.resourceKey),
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
                                    {format(bar.start, "d MMM yyyy", { locale: fr })} →{" "}
                                    {format(bar.end, "d MMM yyyy", { locale: fr })}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
