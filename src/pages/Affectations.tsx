import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { AffectationTertiaire, AffectationOperationnelle } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ZoneCombobox } from "@/components/ZoneCombobox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, Pencil, Trash2, Users, Maximize, Calendar, Search, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { ServicePieChart } from "@/components/ServicePieChart";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SortSelect, SortOption } from "@/components/SortSelect";
import { FormDatePicker } from "@/components/FormDatePicker";
import { ExcelUploadTertiaire } from "@/components/ExcelUploadTertiaire";
import { useDoubleAffectations, useDoubleAffectationIds } from "@/hooks/useDoubleAffectations";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SortTertiaire = "personne" | "service" | "zone" | "periode_asc" | "periode_desc";
type SortOperationnelle = "projet" | "surface_asc" | "surface_desc" | "zone" | "periode_asc" | "periode_desc";

const sortOptionsTertiaire: SortOption[] = [
  { value: "personne", label: "Personne (A-Z)" },
  { value: "service", label: "Service (A-Z)" },
  { value: "zone", label: "Zone (A-Z)" },
  { value: "periode_desc", label: "Période (récent → ancien)" },
  { value: "periode_asc", label: "Période (ancien → récent)" },
];

const sortOptionsOperationnelle: SortOption[] = [
  { value: "projet", label: "Projet (A-Z)" },
  { value: "surface_desc", label: "Surface ↓ (décroissant)" },
  { value: "surface_asc", label: "Surface ↑ (croissant)" },
  { value: "zone", label: "Zone (A-Z)" },
  { value: "periode_desc", label: "Période (récent → ancien)" },
  { value: "periode_asc", label: "Période (ancien → récent)" },
];

const Affectations: React.FC = () => {
  const {
    zones,
    affectationsTertiaires,
    affectationsOperationnelles,
    dateEtat,
    addAffectationTertiaire,
    updateAffectationTertiaire,
    deleteAffectationTertiaire,
    addAffectationOperationnelle,
    updateAffectationOperationnelle,
    deleteAffectationOperationnelle,
  } = useApp();

  const zonesTertiaires = zones.filter((z) => z.type === "tertiaire");
  const zonesOperationnelles = zones.filter((z) => z.type === "operationnelle");

  const doubles = useDoubleAffectations(affectationsTertiaires, affectationsOperationnelles, dateEtat);
  const totalDoubles = doubles.totalTertiaires + doubles.totalOperationnelles;
  const { tertiaireIds: doubleTertiaireIds, operationnelleIds: doubleOpIds } = useDoubleAffectationIds(affectationsTertiaires, affectationsOperationnelles, dateEtat);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Sort state
  const [sortTertiaire, setSortTertiaire] = useState<SortTertiaire>("personne");
  const [sortOperationnelle, setSortOperationnelle] = useState<SortOperationnelle>("projet");

  // Collapsed services state (all collapsed by default)
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  // Tertiaire form state
  const [isTertiaireOpen, setIsTertiaireOpen] = useState(false);
  const [editingTertiaire, setEditingTertiaire] = useState<AffectationTertiaire | null>(null);
  const [tertiaireForm, setTertiaireForm] = useState({
    nom: "",
    prenom: "",
    service: "",
    zone_id: "",
    date_debut: "",
    date_fin: "",
  });

  // Operationnelle form state
  const [isOperationnelleOpen, setIsOperationnelleOpen] = useState(false);
  const [editingOperationnelle, setEditingOperationnelle] = useState<AffectationOperationnelle | null>(null);
  const [operationnelleForm, setOperationnelleForm] = useState({
    nom_projet: "",
    surface_necessaire: "",
    zone_id: "",
    date_debut: "",
    date_fin: "",
  });

  const getZoneName = (zoneId?: string) => {
    if (!zoneId) return "Zone inconnue";
    const zone = zones.find((z) => z.id === zoneId);
    return zone ? `${zone.batiment} - ${zone.nom_zone}` : "Zone inconnue";
  };

  // Filter function for search
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  // Filter tertiaire affectations based on search
  const filteredAffectationsTertiaires = useMemo(() => {
    if (!searchQuery.trim()) return affectationsTertiaires;
    
    return affectationsTertiaires.filter((aff) => {
      const fullName = `${aff.nom} ${aff.prenom}`;
      const zoneName = getZoneName(aff.zone_id);
      return (
        matchesSearch(fullName) ||
        matchesSearch(aff.service) ||
        matchesSearch(zoneName)
      );
    });
  }, [affectationsTertiaires, searchQuery, zones]);

  // Filter operationnelle affectations based on search
  const filteredAffectationsOperationnelles = useMemo(() => {
    if (!searchQuery.trim()) return affectationsOperationnelles;
    
    return affectationsOperationnelles.filter((aff) => {
      const zoneName = getZoneName(aff.zone_id);
      return (
        matchesSearch(aff.nom_projet) ||
        matchesSearch(zoneName)
      );
    });
  }, [affectationsOperationnelles, searchQuery, zones]);

  // Sort function for tertiaire
  const sortTertiaireList = (list: AffectationTertiaire[]) => {
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortTertiaire) {
        case "personne":
          const nameA = `${a.nom} ${a.prenom}`.toLowerCase();
          const nameB = `${b.nom} ${b.prenom}`.toLowerCase();
          return nameA.localeCompare(nameB, "fr");
        case "service":
          return a.service.localeCompare(b.service, "fr");
        case "zone":
          return getZoneName(a.zone_id).localeCompare(getZoneName(b.zone_id), "fr");
        case "periode_asc":
          return new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime();
        case "periode_desc":
          return new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime();
        default:
          return 0;
      }
    });
    return sorted;
  };

  // Group tertiaire affectations by service
  const groupedByService = useMemo(() => {
    const groups: Record<string, AffectationTertiaire[]> = {};
    
    filteredAffectationsTertiaires.forEach((aff) => {
      const service = aff.service || "Sans service";
      if (!groups[service]) {
        groups[service] = [];
      }
      groups[service].push(aff);
    });

    // Sort services alphabetically
    const sortedServices = Object.keys(groups).sort((a, b) => a.localeCompare(b, "fr"));
    
    // Apply tri inside each group
    const result: { service: string; affectations: AffectationTertiaire[] }[] = [];
    sortedServices.forEach((service) => {
      result.push({
        service,
        affectations: sortTertiaireList(groups[service]),
      });
    });

    return result;
  }, [filteredAffectationsTertiaires, sortTertiaire, zones]);

  // Sorted affectations operationnelles
  const sortedAffectationsOperationnelles = useMemo(() => {
    const sorted = [...filteredAffectationsOperationnelles];
    
    sorted.sort((a, b) => {
      switch (sortOperationnelle) {
        case "projet":
          return a.nom_projet.localeCompare(b.nom_projet, "fr");
        case "surface_asc":
          return a.surface_necessaire - b.surface_necessaire;
        case "surface_desc":
          return b.surface_necessaire - a.surface_necessaire;
        case "zone":
          return getZoneName(a.zone_id).localeCompare(getZoneName(b.zone_id), "fr");
        case "periode_asc":
          return new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime();
        case "periode_desc":
          return new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime();
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [filteredAffectationsOperationnelles, sortOperationnelle, zones]);

  const toggleService = (service: string) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(service)) {
        next.delete(service);
      } else {
        next.add(service);
      }
      return next;
    });
  };

  // Tertiaire handlers
  const resetTertiaireForm = () => {
    setTertiaireForm({
      nom: "",
      prenom: "",
      service: "",
      zone_id: "",
      date_debut: "",
      date_fin: "",
    });
    setEditingTertiaire(null);
  };

  const handleTertiaireOpenChange = (open: boolean) => {
    setIsTertiaireOpen(open);
    if (!open) resetTertiaireForm();
  };

  const handleEditTertiaire = (aff: AffectationTertiaire) => {
    setEditingTertiaire(aff);
    setTertiaireForm({
      nom: aff.nom,
      prenom: aff.prenom,
      service: aff.service,
      zone_id: aff.zone_id,
      date_debut: aff.date_debut,
      date_fin: aff.date_fin || "",
    });
    setIsTertiaireOpen(true);
  };

  const handleTertiaireSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      nom: tertiaireForm.nom,
      prenom: tertiaireForm.prenom,
      service: tertiaireForm.service,
      zone_id: tertiaireForm.zone_id || undefined,
      date_debut: tertiaireForm.date_debut,
      date_fin: tertiaireForm.date_fin || undefined,
    };

    if (editingTertiaire) {
      updateAffectationTertiaire({ ...data, id: editingTertiaire.id });
    } else {
      addAffectationTertiaire(data);
    }
    handleTertiaireOpenChange(false);
  };

  // Operationnelle handlers
  const resetOperationnelleForm = () => {
    setOperationnelleForm({
      nom_projet: "",
      surface_necessaire: "",
      zone_id: "",
      date_debut: "",
      date_fin: "",
    });
    setEditingOperationnelle(null);
  };

  const handleOperationnelleOpenChange = (open: boolean) => {
    setIsOperationnelleOpen(open);
    if (!open) resetOperationnelleForm();
  };

  const handleEditOperationnelle = (aff: AffectationOperationnelle) => {
    setEditingOperationnelle(aff);
    setOperationnelleForm({
      nom_projet: aff.nom_projet,
      surface_necessaire: aff.surface_necessaire.toString(),
      zone_id: aff.zone_id,
      date_debut: aff.date_debut,
      date_fin: aff.date_fin || "",
    });
    setIsOperationnelleOpen(true);
  };

  const handleOperationnelleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      nom_projet: operationnelleForm.nom_projet,
      surface_necessaire: parseFloat(operationnelleForm.surface_necessaire) || 0,
      zone_id: operationnelleForm.zone_id || undefined,
      date_debut: operationnelleForm.date_debut,
      date_fin: operationnelleForm.date_fin || undefined,
    };

    if (editingOperationnelle) {
      updateAffectationOperationnelle({ ...data, id: editingOperationnelle.id });
    } else {
      addAffectationOperationnelle(data);
    }
    handleOperationnelleOpenChange(false);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMM yyyy", { locale: fr });
  };

  // Render tertiaire row
  const renderTertiaireRow = (aff: AffectationTertiaire) => {
    const isDouble = doubleTertiaireIds.has(aff.id);
    return (
    <TableRow key={aff.id} className={cn(isDouble && "bg-destructive/5")}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-1.5">
          {isDouble && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cette ressource a plusieurs affectations actives à la date sélectionnée</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {aff.prenom} {aff.nom}
        </div>
      </TableCell>
      <TableCell>{getZoneName(aff.zone_id)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="w-3 h-3" />
          {formatDate(aff.date_debut)}
          {aff.date_fin && ` → ${formatDate(aff.date_fin)}`}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEditTertiaire(aff)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer l'affectation ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteAffectationTertiaire(aff.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Gestion des Affectations</h1>
        <p className="text-muted-foreground">
          Gérez les affectations de personnes et projets aux zones
        </p>
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

      {/* Search field */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par nom, service, projet ou zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="tertiaire" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tertiaire" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Tertiaire ({filteredAffectationsTertiaires.length})
          </TabsTrigger>
          <TabsTrigger value="operationnelle" className="flex items-center gap-2">
            <Maximize className="w-4 h-4" />
            Opérationnelle ({filteredAffectationsOperationnelles.length})
          </TabsTrigger>
        </TabsList>

        {/* Tertiaire Tab */}
        <TabsContent value="tertiaire" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <SortSelect
              options={sortOptionsTertiaire}
              value={sortTertiaire}
              onChange={(v) => setSortTertiaire(v as SortTertiaire)}
            />
            <div className="sm:ml-auto flex gap-2">
              <ExcelUploadTertiaire />
              <Dialog open={isTertiaireOpen} onOpenChange={handleTertiaireOpenChange}>
                <DialogTrigger asChild>
                  <Button disabled={zonesTertiaires.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle affectation
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTertiaire ? "Modifier l'affectation" : "Nouvelle affectation tertiaire"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTertiaireSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nom">Nom</Label>
                        <Input
                          id="nom"
                          value={tertiaireForm.nom}
                          onChange={(e) => setTertiaireForm({ ...tertiaireForm, nom: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prenom">Prénom</Label>
                        <Input
                          id="prenom"
                          value={tertiaireForm.prenom}
                          onChange={(e) => setTertiaireForm({ ...tertiaireForm, prenom: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service">Service</Label>
                      <Input
                        id="service"
                        value={tertiaireForm.service}
                        onChange={(e) => setTertiaireForm({ ...tertiaireForm, service: e.target.value })}
                        placeholder="Direction, RH, IT..."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zone">Zone</Label>
                      <ZoneCombobox
                        zones={zonesTertiaires}
                        value={tertiaireForm.zone_id}
                        onChange={(v) => setTertiaireForm({ ...tertiaireForm, zone_id: v })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date_debut">Date de début</Label>
                        <FormDatePicker
                          value={tertiaireForm.date_debut}
                          onChange={(value) => setTertiaireForm({ ...tertiaireForm, date_debut: value })}
                          placeholder="Date de début"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_fin">Date de fin (optionnel)</Label>
                        <FormDatePicker
                          value={tertiaireForm.date_fin}
                          onChange={(value) => setTertiaireForm({ ...tertiaireForm, date_fin: value })}
                          placeholder="Date de fin"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => handleTertiaireOpenChange(false)}>
                        Annuler
                      </Button>
                      <Button type="submit">
                        {editingTertiaire ? "Mettre à jour" : "Créer"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {zonesTertiaires.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucune zone tertiaire
              </h3>
              <p className="text-muted-foreground">
                Créez d'abord des zones tertiaires dans la section "Zones"
              </p>
            </div>
          ) : filteredAffectationsTertiaires.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchQuery ? "Aucun résultat" : "Aucune affectation tertiaire"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Aucune affectation ne correspond à votre recherche" 
                  : "Ajoutez des personnes aux zones tertiaires"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedByService.map(({ service, affectations }) => (
                <Collapsible
                  key={service}
                  open={expandedServices.has(service)}
                  onOpenChange={() => toggleService(service)}
                >
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {expandedServices.has(service) ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="font-semibold text-foreground">{service}</span>
                          <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {affectations.length} personne{affectations.length > 1 ? "s" : ""}
                          </span>
                          <ServicePieChart
                            service={service}
                            affectations={affectations}
                            zones={zones}
                            dateEtat={dateEtat}
                          />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Personne</TableHead>
                              <TableHead>Zone</TableHead>
                              <TableHead>Période</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {affectations.map(renderTertiaireRow)}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Operationnelle Tab */}
        <TabsContent value="operationnelle" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <SortSelect
              options={sortOptionsOperationnelle}
              value={sortOperationnelle}
              onChange={(v) => setSortOperationnelle(v as SortOperationnelle)}
            />
            <div className="sm:ml-auto">
              <Dialog open={isOperationnelleOpen} onOpenChange={handleOperationnelleOpenChange}>
                <DialogTrigger asChild>
                  <Button disabled={zonesOperationnelles.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle affectation
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingOperationnelle ? "Modifier l'affectation" : "Nouvelle affectation opérationnelle"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleOperationnelleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom_projet">Nom du projet</Label>
                      <Input
                        id="nom_projet"
                        value={operationnelleForm.nom_projet}
                        onChange={(e) => setOperationnelleForm({ ...operationnelleForm, nom_projet: e.target.value })}
                        placeholder="Projet XYZ"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="surface">Surface nécessaire (m²)</Label>
                      <Input
                        id="surface"
                        type="number"
                        min="0"
                        step="0.1"
                        value={operationnelleForm.surface_necessaire}
                        onChange={(e) => setOperationnelleForm({ ...operationnelleForm, surface_necessaire: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zone_op">Zone</Label>
                      <ZoneCombobox
                        zones={zonesOperationnelles}
                        value={operationnelleForm.zone_id}
                        onChange={(v) => setOperationnelleForm({ ...operationnelleForm, zone_id: v })}
                        formatLabel={(z) => `${z.batiment} - ${z.nom_zone} (${z.capacite_max} m²)`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date_debut_op">Date de début</Label>
                        <FormDatePicker
                          value={operationnelleForm.date_debut}
                          onChange={(value) => setOperationnelleForm({ ...operationnelleForm, date_debut: value })}
                          placeholder="Date de début"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_fin_op">Date de fin (optionnel)</Label>
                        <FormDatePicker
                          value={operationnelleForm.date_fin}
                          onChange={(value) => setOperationnelleForm({ ...operationnelleForm, date_fin: value })}
                          placeholder="Date de fin"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => handleOperationnelleOpenChange(false)}>
                        Annuler
                      </Button>
                      <Button type="submit">
                        {editingOperationnelle ? "Mettre à jour" : "Créer"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {zonesOperationnelles.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Maximize className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucune zone opérationnelle
              </h3>
              <p className="text-muted-foreground">
                Créez d'abord des zones opérationnelles dans la section "Zones"
              </p>
            </div>
          ) : filteredAffectationsOperationnelles.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Maximize className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchQuery ? "Aucun résultat" : "Aucune affectation opérationnelle"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Aucune affectation ne correspond à votre recherche" 
                  : "Ajoutez des projets aux zones opérationnelles"}
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projet</TableHead>
                    <TableHead>Surface</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAffectationsOperationnelles.map((aff) => {
                    const isDouble = doubleOpIds.has(aff.id);
                    return (
                    <TableRow key={aff.id} className={cn(isDouble && "bg-destructive/5")}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {isDouble && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ce projet a plusieurs affectations actives à la date sélectionnée</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {aff.nom_projet}
                        </div>
                      </TableCell>
                      <TableCell>{aff.surface_necessaire} m²</TableCell>
                      <TableCell>{getZoneName(aff.zone_id)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3" />
                          {formatDate(aff.date_debut)}
                          {aff.date_fin && ` → ${formatDate(aff.date_fin)}`}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEditOperationnelle(aff)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer l'affectation ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAffectationOperationnelle(aff.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Affectations;
