import React, { useMemo, useState } from "react";
import { AffectationTertiaire, Zone } from "@/types";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const COLORS = [
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

interface ChartDataItem {
  name: string;
  value: number;
  percent: number;
}

interface BuildingServicePieChartProps {
  batiment: string;
  affectations: AffectationTertiaire[];
  zones: Zone[];
  dateEtat: Date;
}

function isActiveAtDate(dateDebut: string, dateFin: string | undefined, date: Date): boolean {
  const debut = new Date(dateDebut);
  debut.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  if (debut > checkDate) return false;
  if (!dateFin) return true;
  const fin = new Date(dateFin);
  fin.setHours(23, 59, 59, 999);
  return fin >= checkDate;
}

export const BuildingServicePieChart: React.FC<BuildingServicePieChartProps> = ({
  batiment,
  affectations,
  zones,
  dateEtat,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const chartData = useMemo<ChartDataItem[]>(() => {
    const batimentZoneIds = new Set(
      zones.filter((z) => z.batiment === batiment && z.type === "tertiaire").map((z) => z.id)
    );

    const active = affectations.filter(
      (a) => a.zone_id && batimentZoneIds.has(a.zone_id) && isActiveAtDate(a.date_debut, a.date_fin, dateEtat)
    );

    const byService: Record<string, number> = {};
    active.forEach((a) => {
      byService[a.service] = (byService[a.service] || 0) + 1;
    });

    const total = active.length;
    if (total === 0) return [];

    return Object.entries(byService)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({
        name,
        value,
        percent: Math.round((value / total) * 100),
      }));
  }, [affectations, zones, batiment, dateEtat]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (chartData.length === 0) return null;

  return (
    <>
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setModalOpen(true);
            }}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-muted/80 transition-colors shrink-0"
            title={`Répartition par service — ${batiment}`}
          >
            <svg width={40} height={40} viewBox="0 0 40 40">
              <MiniPieSlices data={chartData} cx={20} cy={20} r={18} />
            </svg>
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-60 p-3" side="right">
          <p className="font-medium text-sm mb-2">{batiment} — {total} pers.</p>
          <div className="space-y-1">
            {chartData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-foreground">{d.name}</span>
                </div>
                <span className="text-muted-foreground">{d.value} ({d.percent}%)</span>
              </div>
            ))}
          </div>
        </HoverCardContent>
      </HoverCard>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Répartition par service — {batiment}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Total : {total} personne{total > 1 ? "s" : ""} active{total > 1 ? "s" : ""}
          </p>
          <div className="flex justify-center mb-4">
            <svg width={200} height={200} viewBox="0 0 200 200">
              <MiniPieSlices data={chartData} cx={100} cy={100} r={90} />
            </svg>
          </div>
          <div className="border-t border-border pt-3 space-y-1.5">
            {chartData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span>{d.name}</span>
                </div>
                <span className="text-muted-foreground font-medium">
                  {d.value} pers. ({d.percent}%)
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const MiniPieSlices: React.FC<{
  data: ChartDataItem[];
  cx: number;
  cy: number;
  r: number;
}> = ({ data, cx, cy, r }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumAngle = -90;
  return (
    <>
      {data.map((d, i) => {
        const angle = (d.value / total) * 360;
        const startAngle = cumAngle;
        cumAngle += angle;
        const endAngle = cumAngle;

        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);

        const largeArc = angle > 180 ? 1 : 0;

        if (data.length === 1) {
          return <circle key={i} cx={cx} cy={cy} r={r} fill={COLORS[i % COLORS.length]} />;
        }

        return (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
            fill={COLORS[i % COLORS.length]}
          />
        );
      })}
    </>
  );
};
