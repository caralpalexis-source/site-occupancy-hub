import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { AffectationTertiaire, Zone } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

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

interface ServicePieChartProps {
  service: string;
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

interface ChartDataItem {
  name: string;
  value: number;
  percent: number;
}

export const ServicePieChart: React.FC<ServicePieChartProps> = ({
  service,
  affectations,
  zones,
  dateEtat,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const chartData = useMemo<ChartDataItem[]>(() => {
    const active = affectations.filter((a) =>
      isActiveAtDate(a.date_debut, a.date_fin, dateEtat)
    );

    const byBatiment: Record<string, number> = {};
    active.forEach((a) => {
      const zone = zones.find((z) => z.id === a.zone_id);
      const bat = zone ? zone.batiment : "Non affecté";
      byBatiment[bat] = (byBatiment[bat] || 0) + 1;
    });

    const total = active.length;
    if (total === 0) return [];

    return Object.entries(byBatiment)
      .sort(([a], [b]) => a.localeCompare(b, "fr"))
      .map(([name, value]) => ({
        name,
        value,
        percent: Math.round((value / total) * 100),
      }));
  }, [affectations, zones, dateEtat]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (chartData.length === 0) return null;

  const renderMiniPie = () => (
    <svg width={28} height={28} viewBox="0 0 28 28">
      <MiniPieSlices data={chartData} cx={14} cy={14} r={12} />
    </svg>
  );

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
            className="flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-muted/80 transition-colors"
            title={`Répartition ${service} par bâtiment`}
          >
            {renderMiniPie()}
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-56 p-3" side="right">
          <p className="font-medium text-sm mb-2">{service} — {total} pers.</p>
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
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              Répartition par bâtiment — {service}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Total : {total} personne{total > 1 ? "s" : ""} active{total > 1 ? "s" : ""} à la date d'état
          </p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${percent}%)`}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: number, name: string) => [`${value} pers.`, name]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="border-t border-border pt-3 space-y-1">
            {chartData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
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

// Simple SVG mini pie chart
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
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill={COLORS[i % COLORS.length]} />
          );
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
