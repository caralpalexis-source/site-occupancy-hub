import React, { useState, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";
import { useApp } from "@/context/AppContext";
import { AppData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Download, Upload, FileJson, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, HardDrive, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024; // 5 Mo
const STORAGE_KEY = "site-management-data";
const BUILDING_PLANS_KEY = "site-management-building-plans";

const getLocalStorageSize = (): number => {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      total += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
    }
  }
  return total;
};

const getKeySize = (key: string): number => {
  const val = localStorage.getItem(key);
  if (!val) return 0;
  return (key.length + val.length) * 2;
};

const getCategorySize = (key: string, field?: string): number => {
  const raw = localStorage.getItem(key);
  if (!raw) return 0;
  if (!field) return (key.length + raw.length) * 2;
  try {
    const data = JSON.parse(raw);
    const fieldJson = JSON.stringify(data[field] || []);
    return fieldJson.length * 2;
  } catch {
    return 0;
  }
};

const StorageIndicator: React.FC = () => {
  const usedBytes = getLocalStorageSize();
  const usedKo = usedBytes / 1024;
  const limitKo = STORAGE_LIMIT_BYTES / 1024;
  const percentage = Math.min((usedBytes / STORAGE_LIMIT_BYTES) * 100, 100);

  const zonesSize = getCategorySize(STORAGE_KEY, "zones");
  const tertiaireSize = getCategorySize(STORAGE_KEY, "affectationsTertiaires");
  const operationnelleSize = getCategorySize(STORAGE_KEY, "affectationsOperationnelles");
  const plansSize = getKeySize(BUILDING_PLANS_KEY);

  const formatSize = (bytes: number) => {
    const ko = bytes / 1024;
    return ko >= 1024 ? `${(ko / 1024).toFixed(2)} Mo` : `${ko.toFixed(1)} Ko`;
  };

  const barColor =
    percentage > 85 ? "bg-destructive" : percentage > 60 ? "bg-warning" : "bg-success";

  const categories = [
    { label: "Zones", size: zonesSize },
    { label: "Affectations tertiaires", size: tertiaireSize },
    { label: "Affectations opérationnelles", size: operationnelleSize },
    { label: "Plans bâtiments", size: plansSize },
  ];

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          Stockage Local
        </CardTitle>
        <CardDescription>Utilisation du Local Storage du navigateur</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {formatSize(usedBytes)} / {formatSize(STORAGE_LIMIT_BYTES)}
          </span>
          <span className="font-medium text-foreground">{percentage.toFixed(1)}%</span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {percentage > 85 && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-destructive text-sm">Capacité critique</AlertTitle>
            <AlertDescription className="text-sm">
              Attention : capacité de stockage bientôt atteinte. Envisager un export et nettoyage.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        <div>
          <h4 className="text-sm font-medium flex items-center gap-1.5 mb-3">
            📊 Détail du stockage
          </h4>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.label} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{cat.label}</span>
                <span className="font-mono text-foreground">{formatSize(cat.size)}</span>
              </div>
            ))}
            <Separator className="my-1" />
            <div className="flex justify-between items-center text-sm font-semibold">
              <span>Total</span>
              <span className="font-mono">{formatSize(usedBytes)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DataManagement: React.FC = () => {
  const { exportData, importData, zones, affectationsTertiaires, affectationsOperationnelles } = useApp();
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [excelExportOpen, setExcelExportOpen] = useState(false);
  const [excelExportDate, setExcelExportDate] = useState<Date>(new Date());

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

  const buildExcelRows = (filterDate?: Date) => {
    const rows: Record<string, string>[] = [];
    const tertiaires = filterDate
      ? affectationsTertiaires.filter((a) => isActiveAtDate(a.date_debut, a.date_fin, filterDate))
      : affectationsTertiaires;
    const operationnelles = filterDate
      ? affectationsOperationnelles.filter((a) => isActiveAtDate(a.date_debut, a.date_fin, filterDate))
      : affectationsOperationnelles;

    tertiaires.forEach((a) => {
      const zone = zones.find((z) => z.id === a.zone_id);
      rows.push({
        "id_affectation": a.id,
        "Type ressource": "Tertiaire",
        "Nom": a.nom,
        "Prenom": a.prenom,
        "Service": a.service || "",
        "Statut": a.statut || "Titulaire",
        "Surface": "",
        "Zone": zone ? zone.nom_zone : "Zone inconnue",
        "Date_debut": a.date_debut,
        "Date_fin": a.date_fin || "",
      });
    });

    operationnelles.forEach((a) => {
      const zone = zones.find((z) => z.id === a.zone_id);
      rows.push({
        "id_affectation": a.id,
        "Type ressource": "Opérationnelle",
        "Nom": a.nom_projet,
        "Prenom": "",
        "Service": "",
        "Statut": "",
        "Surface": String(a.surface_necessaire),
        "Zone": zone ? zone.nom_zone : "Zone inconnue",
        "Date_debut": a.date_debut,
        "Date_fin": a.date_fin || "",
      });
    });

    return rows;
  };

  const applySheetFormatting = (ws: XLSX.WorkSheet, rows: Record<string, string>[]) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const colCount = headers.length;
    const rowCount = rows.length + 1; // +1 for header

    // Auto column widths
    const colWidths = headers.map((h, i) => {
      let max = h.length;
      rows.forEach((r) => {
        const val = r[h] || "";
        if (val.length > max) max = val.length;
      });
      return { wch: Math.min(max + 2, 40) };
    });
    ws["!cols"] = colWidths;

    // Freeze first row
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    if (!ws["!views"]) ws["!views"] = [];
    (ws["!views"] as any[]).push({ state: "frozen", ySplit: 1 });

    // Autofilter on header row
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowCount - 1, c: colCount - 1 } }),
    };
  };

  const handleExportExcel = () => {
    const date = excelExportDate;
    const rows = buildExcelRows(date);

    const ws = XLSX.utils.json_to_sheet(rows);
    applySheetFormatting(ws, rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Affectations");

    const noticeWs = XLSX.utils.aoa_to_sheet([
      ["⚠️ Fichier de consultation – non destiné à la synchronisation."],
      ["Export photo à date : " + format(date, "PPP", { locale: fr })],
      ["Ce fichier ne contient que les affectations actives à cette date."],
      ["Pour la synchronisation, utilisez l'export complet."],
    ]);
    XLSX.utils.book_append_sheet(wb, noticeWs, "Information");

    const dateStr = format(date, "yyyy-MM-dd");
    XLSX.writeFile(wb, `export_photo_${dateStr}.xlsx`, { bookType: "xlsx" });

    setExcelExportOpen(false);
    toast({
      title: "Export Excel réussi",
      description: `${rows.length} affectations exportées au ${format(date, "PPP", { locale: fr })}.`,
    });
  };

  const handleExportExcelComplet = () => {
    const rows = buildExcelRows();

    const ws = XLSX.utils.json_to_sheet(rows);
    applySheetFormatting(ws, rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Affectations");

    const noticeWs = XLSX.utils.aoa_to_sheet([
      ["✅ Fichier d'export complet pour synchronisation."],
      ["Date d'export : " + format(new Date(), "PPP", { locale: fr })],
      ["Ce fichier contient toutes les affectations (passées, actives, futures)."],
      ["Il peut être utilisé en mode Synchronisation à l'import."],
    ]);
    XLSX.utils.book_append_sheet(wb, noticeWs, "Information");

    const dateStr = format(new Date(), "yyyy-MM-dd");
    XLSX.writeFile(wb, `export_complet_sync_${dateStr}.xlsx`, { bookType: "xlsx" });

    toast({
      title: "Export complet réussi",
      description: `${rows.length} affectations exportées (toutes périodes confondues).`,
    });
  };

  const handleExportJSON = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `site-management-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "Export réussi",
      description: "Vos données ont été exportées en JSON.",
    });
  };

  const validateImportData = (data: unknown): data is AppData => {
    if (!data || typeof data !== "object") return false;
    const d = data as Record<string, unknown>;
    
    if (!Array.isArray(d.zones)) return false;
    if (!Array.isArray(d.affectationsTertiaires)) return false;
    if (!Array.isArray(d.affectationsOperationnelles)) return false;

    // Validate zones
    for (const zone of d.zones) {
      if (!zone.id || !zone.type || !zone.batiment || !zone.nom_zone || zone.capacite_max === undefined) {
        return false;
      }
      if (zone.type !== "tertiaire" && zone.type !== "operationnelle") {
        return false;
      }
    }

    // Validate affectations tertiaires
    for (const aff of d.affectationsTertiaires) {
      if (!aff.id || !aff.nom || !aff.prenom || !aff.service || !aff.date_debut) {
        return false;
      }
    }

    // Validate affectations operationnelles
    for (const aff of d.affectationsOperationnelles) {
      if (!aff.id || !aff.nom_projet || aff.surface_necessaire === undefined || !aff.date_debut) {
        return false;
      }
    }

    return true;
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (validateImportData(data)) {
          importData(data);
          setImportSuccess(true);
          toast({
            title: "Import réussi",
            description: `${data.zones.length} zones, ${data.affectationsTertiaires.length} affectations tertiaires, ${data.affectationsOperationnelles.length} affectations opérationnelles importées.`,
          });
        } else {
          setImportError("Structure du fichier JSON invalide. Vérifiez que le fichier contient les propriétés zones, affectationsTertiaires et affectationsOperationnelles avec les champs requis.");
        }
      } catch (err) {
        setImportError("Erreur lors de la lecture du fichier JSON. Assurez-vous que le fichier est un JSON valide.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation for Excel files
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    
    if (!validExtensions.includes(extension)) {
      setImportError("Format de fichier non supporté. Veuillez utiliser un fichier .xlsx, .xls ou .csv");
      return;
    }

    // For now, show a message that Excel import requires additional setup
    setImportError(
      "L'import Excel nécessite une configuration avancée. Pour l'instant, veuillez utiliser l'import JSON. " +
      "Convertissez votre fichier Excel en JSON avec la structure suivante : { zones: [...], affectationsTertiaires: [...], affectationsOperationnelles: [...] }"
    );

    if (excelInputRef.current) {
      excelInputRef.current.value = "";
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Data Management</h1>
        <p className="text-muted-foreground">
          Importez et exportez vos données pour les sauvegarder ou les transférer
        </p>
      </div>

      {/* Current Data Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Données actuelles</CardTitle>
          <CardDescription>Résumé des données stockées localement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-foreground">{zones.length}</p>
              <p className="text-sm text-muted-foreground">Zones</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-foreground">{affectationsTertiaires.length}</p>
              <p className="text-sm text-muted-foreground">Affectations tertiaires</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-foreground">{affectationsOperationnelles.length}</p>
              <p className="text-sm text-muted-foreground">Affectations opérationnelles</p>
            </div>
          </div>
      </CardContent>
      </Card>

      {/* Local Storage Usage Indicator */}
      <StorageIndicator />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Exporter les données
            </CardTitle>
            <CardDescription>
              Téléchargez une sauvegarde complète de vos données au format JSON
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Button onClick={handleExportJSON} className="w-full">
                <FileJson className="w-4 h-4 mr-2" />
                Exporter en JSON
              </Button>
              <Button onClick={() => { setExcelExportDate(new Date()); setExcelExportOpen(true); }} variant="outline" className="w-full">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Excel – Photo à date (.xlsx)
              </Button>
              <Button onClick={handleExportExcelComplet} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Export complet pour synchronisation (.xlsx)
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ Seul l'export complet doit être utilisé pour les mises à jour via le mode Synchronisation.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Excel Export Modal */}
        <Dialog open={excelExportOpen} onOpenChange={setExcelExportOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Export Excel des affectations</DialogTitle>
              <DialogDescription>
                Sélectionnez la date d'état pour l'export
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <Calendar
                mode="single"
                selected={excelExportDate}
                onSelect={(d) => d && setExcelExportDate(d)}
                locale={fr}
                captionLayout="dropdown-buttons"
                fromYear={2000}
                toYear={2100}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setExcelExportOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleExportExcel}>
                Générer l'export
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Importer des données
            </CardTitle>
            <CardDescription>
              Restaurez vos données à partir d'une sauvegarde
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="json-import">Import JSON (recommandé)</Label>
              <Input
                id="json-import"
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                ref={fileInputRef}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="excel-import">Import Excel</Label>
              <Input
                id="excel-import"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportExcel}
                ref={excelInputRef}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Messages */}
      {importSuccess && (
        <Alert className="mt-6 border-success bg-success/10">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertTitle className="text-success">Import réussi</AlertTitle>
          <AlertDescription>
            Vos données ont été importées avec succès.
          </AlertDescription>
        </Alert>
      )}

      {importError && (
        <Alert className="mt-6 border-destructive bg-destructive/10">
          <XCircle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">Erreur d'import</AlertTitle>
          <AlertDescription>{importError}</AlertDescription>
        </Alert>
      )}

      {/* JSON Structure Help */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Structure JSON requise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "zones": [
    {
      "id": "uuid",
      "type": "tertiaire" | "operationnelle",
      "batiment": "Bâtiment A",
      "nom_zone": "Bureau 101",
      "capacite_max": 10,
      "image_plan": "base64..." // optionnel
    }
  ],
  "affectationsTertiaires": [
    {
      "id": "uuid",
      "nom": "Dupont",
      "prenom": "Jean",
      "service": "IT",
      "statut": "Titulaire", // optionnel: Titulaire|Prestataire|Intérimaire|Alternant
      "zone_id": "uuid",
      "date_debut": "2024-01-01",
      "date_fin": "2024-12-31" // optionnel
    }
  ],
  "affectationsOperationnelles": [
    {
      "id": "uuid",
      "nom_projet": "Projet Alpha",
      "surface_necessaire": 150,
      "zone_id": "uuid",
      "date_debut": "2024-01-01",
      "date_fin": "2024-06-30" // optionnel
    }
  ]
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataManagement;
