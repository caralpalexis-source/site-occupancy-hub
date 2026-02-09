import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ParsedRow {
  rowNumber: number;
  nom: string;
  prenom: string;
  service: string;
  zoneName: string;
  date_debut: string;
  date_fin?: string;
  zoneId?: string;
  error?: string;
  isDuplicate?: boolean;
}

interface ImportSummary {
  totalRows: number;
  validRows: ParsedRow[];
  errorRows: ParsedRow[];
  duplicateRows: ParsedRow[];
}

export const ExcelUploadTertiaire: React.FC = () => {
  const { zones, affectationsTertiaires, addAffectationTertiaire } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [fileName, setFileName] = useState("");

  const zonesTertiaires = zones.filter((z) => z.type === "tertiaire");

  const findZoneByName = (zoneName: string) => {
    const normalizedSearch = zoneName.trim().toLowerCase();
    
    return zonesTertiaires.find((z) => {
      const fullName = `${z.batiment} - ${z.nom_zone}`.toLowerCase();
      const justName = z.nom_zone.toLowerCase();
      return fullName === normalizedSearch || justName === normalizedSearch;
    });
  };

  const parseExcelDate = (value: unknown): string | undefined => {
    if (!value) return undefined;
    
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
      return undefined;
    }
    
    if (typeof value === "number") {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      return date.toISOString().split("T")[0];
    }
    
    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }
    
    return undefined;
  };

  const isDuplicateAffectation = (row: ParsedRow): boolean => {
    if (!row.zoneId) return false;
    
    return affectationsTertiaires.some((existing) => {
      const samePerson = 
        existing.nom.toLowerCase() === row.nom.toLowerCase() &&
        existing.prenom.toLowerCase() === row.prenom.toLowerCase();
      const sameZone = existing.zone_id === row.zoneId;
      const sameDates = 
        existing.date_debut === row.date_debut &&
        (existing.date_fin || "") === (row.date_fin || "");
      
      return samePerson && sameZone && sameDates;
    });
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, defval: "" });
      
      const parsedRows: ParsedRow[] = [];
      
      jsonData.forEach((row, index) => {
        const rowNumber = index + 2;
        
        const nom = String(row["Nom"] || row["nom"] || "").trim();
        const prenom = String(row["Prénom"] || row["Prenom"] || row["prenom"] || "").trim();
        const service = String(row["Service"] || row["service"] || "").trim();
        const zoneName = String(row["Zone"] || row["zone"] || "").trim();
        const dateDebutRaw = row["Date_debut"] || row["date_debut"] || row["Date debut"] || "";
        const dateFinRaw = row["Date_fin"] || row["date_fin"] || row["Date fin"] || "";
        
        const date_debut = parseExcelDate(dateDebutRaw);
        const date_fin = parseExcelDate(dateFinRaw);
        
        const parsedRow: ParsedRow = {
          rowNumber,
          nom,
          prenom,
          service,
          zoneName,
          date_debut: date_debut || "",
          date_fin,
        };
        
        if (!nom) {
          parsedRow.error = "Nom manquant";
        } else if (!prenom) {
          parsedRow.error = "Prénom manquant";
        } else if (!service) {
          parsedRow.error = "Service manquant";
        } else if (!zoneName) {
          parsedRow.error = "Zone manquante";
        } else if (!date_debut) {
          parsedRow.error = "Date de début invalide ou manquante";
        } else {
          const zone = findZoneByName(zoneName);
          if (!zone) {
            parsedRow.error = `Zone "${zoneName}" non trouvée`;
          } else {
            parsedRow.zoneId = zone.id;
            parsedRow.isDuplicate = isDuplicateAffectation(parsedRow);
          }
        }
        
        parsedRows.push(parsedRow);
      });
      
      const validRows = parsedRows.filter((r) => !r.error && !r.isDuplicate);
      const errorRows = parsedRows.filter((r) => r.error);
      const duplicateRows = parsedRows.filter((r) => !r.error && r.isDuplicate);
      
      setImportSummary({
        totalRows: parsedRows.length,
        validRows,
        errorRows,
        duplicateRows,
      });
      
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error processing Excel file:", error);
      toast({
        title: "Erreur de lecture",
        description: "Impossible de lire le fichier Excel. Vérifiez le format du fichier.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleConfirmImport = () => {
    if (!importSummary) return;
    
    let importedCount = 0;
    
    importSummary.validRows.forEach((row) => {
      if (row.zoneId) {
        addAffectationTertiaire({
          nom: row.nom,
          prenom: row.prenom,
          service: row.service,
          zone_id: row.zoneId,
          date_debut: row.date_debut,
          date_fin: row.date_fin,
        });
        importedCount++;
      }
    });
    
    toast({
      title: "Import réussi",
      description: `${importedCount} affectation(s) tertiaire(s) importée(s).`,
    });
    
    setIsDialogOpen(false);
    setImportSummary(null);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setImportSummary(null);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing || zonesTertiaires.length === 0}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        Import Excel
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Import des affectations tertiaires
            </DialogTitle>
            <DialogDescription>
              Fichier : {fileName}
            </DialogDescription>
          </DialogHeader>

          {importSummary && (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{importSummary.totalRows}</div>
                  <div className="text-sm text-muted-foreground">lignes détectées</div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-2xl font-bold text-primary">{importSummary.validRows.length}</div>
                    <div className="text-xs text-muted-foreground">valides</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <div>
                    <div className="text-2xl font-bold text-destructive">{importSummary.errorRows.length}</div>
                    <div className="text-xs text-muted-foreground">erreurs</div>
                  </div>
                </div>
              </div>

              {/* Duplicates warning */}
              {importSummary.duplicateRows.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-accent border border-border rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-accent-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-accent-foreground">
                      {importSummary.duplicateRows.length} doublon(s) ignoré(s)
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Ces affectations existent déjà (même personne, zone et période).
                    </div>
                  </div>
                </div>
              )}

              {/* Error details */}
              {importSummary.errorRows.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Lignes en erreur
                  </h4>
                  <ScrollArea className="h-[150px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Ligne</TableHead>
                          <TableHead>Données</TableHead>
                          <TableHead>Erreur</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importSummary.errorRows.map((row) => (
                          <TableRow key={row.rowNumber}>
                            <TableCell className="font-mono">{row.rowNumber}</TableCell>
                            <TableCell className="text-sm">
                              {row.prenom} {row.nom} - {row.zoneName || "(vide)"}
                            </TableCell>
                            <TableCell className="text-destructive text-sm">
                              {row.error}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}

              {/* Valid rows preview */}
              {importSummary.validRows.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Affectations à importer ({importSummary.validRows.length})
                  </h4>
                  <ScrollArea className="h-[200px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Zone</TableHead>
                          <TableHead>Période</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importSummary.validRows.map((row) => (
                          <TableRow key={row.rowNumber}>
                            <TableCell>{row.prenom} {row.nom}</TableCell>
                            <TableCell>{row.service}</TableCell>
                            <TableCell>{row.zoneName}</TableCell>
                            <TableCell className="text-sm">
                              {row.date_debut}
                              {row.date_fin && ` → ${row.date_fin}`}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={!importSummary || importSummary.validRows.length === 0}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirmer l'import ({importSummary?.validRows.length || 0})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
