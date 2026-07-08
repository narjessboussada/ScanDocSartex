import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ValidatedCountPipe } from '../../../shared/pipes/validated-count.pipe';
import * as XLSX from 'xlsx';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import { ScanService, Field, Scan, Qualite } from '../../../core/services/scan.service';

@Component({
  selector: 'app-scan-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatTableModule, MatInputModule,
    MatFormFieldModule, MatTooltipModule, MatDividerModule,
    MatSnackBarModule,
    ValidatedCountPipe,
  ],
  templateUrl: './scan-detail.component.html',
  styleUrls: ['./scan-detail.component.css'],
})
export class ScanDetailComponent implements OnInit {
  private route       = inject(ActivatedRoute);
  router              = inject(Router);
  private scanService = inject(ScanService);
  private snackBar    = inject(MatSnackBar);

  scan          : Scan | null = null;
  fields        : Field[]     = [];
  articles      : { num: string, code: Field|null, desc: Field|null, qte: Field|null, pu: Field|null, total: Field|null }[] = [];
  imageBase64   : string      = '';
  isLoading     : boolean     = true;
  errorMessage  : string      = '';
  qualite       : Qualite | null = null;

  editingFieldId : number | null = null;
  editingValue   : string        = '';
  zoomLevel      : number        = 1;

  
  get validationPercentage(): number {
    if (!this.fields.length) return 0;
    const validatedCount = this.fields.filter(field => field.is_validated).length;
    return Math.round((validatedCount / this.fields.length) * 100);
  }

  ngOnInit() {
    const id = parseInt(this.route.snapshot.paramMap.get('id') || '0');
    if (!id) { this.router.navigate(['/scans']); return; }
    this.loadScan(id);
  }

  loadScan(id: number) {
    this.isLoading = true;
    this.scanService.getScanById(id).subscribe({
      next: (res) => {
        this.scan        = res.data.document;
        this.fields      = res.data.fields;
        this.imageBase64 = res.data.document?.image_base64 || '';
        this.qualite     = res.data.document?.qualite || null;
        this.updateArticles();
        this.isLoading   = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur de chargement';
        this.isLoading    = false;
      },
    });
  }

  // ── Édition ──────────────────────────────────────────────

  startEdit(field: Field) {
    this.editingFieldId = field.id;
    this.editingValue   = field.corrected_value || field.field_value;
  }

  saveEdit(field: Field) {
    if (this.editingValue === (field.corrected_value || field.field_value) && field.is_validated) {
      this.editingFieldId = null;
      return;
    }
    
    this.scanService.validateField(field.id, true, this.editingValue).subscribe({
      next: () => {
        field.corrected_value = this.editingValue;
        field.is_validated    = true;
        this.editingFieldId   = null;
        this.editingValue     = '';
        this.updateArticles();
        this.snackBar.open('Modifications enregistrées', 'Fermer', {
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      },
      error: (err) => { this.errorMessage = err.error?.message || 'Erreur'; },
    });
  }

  cancelEdit() {
    this.editingFieldId = null;
    this.editingValue   = '';
  }

  // ── Zoom ─────────────────────────────────────────────────

  zoomIn() { this.zoomLevel = Math.min(3, this.zoomLevel + 0.25); }
  zoomOut() { this.zoomLevel = Math.max(0.5, this.zoomLevel - 0.25); }

  // ── Validation ───────────────────────────────────────────

  validateSingleField(field: Field, validate: boolean) {
    if (validate) {
      field.is_validated = true;
      field.is_rejected  = false;
    } else {
      field.is_validated = false;
      field.is_rejected  = true;
    }

    this.scanService.validateField(field.id, validate).subscribe({
      next: () => {},
      error: (err) => { this.errorMessage = err.error?.message || 'Erreur'; },
    });
  }

  validateField(field: Field) {
    this.validateSingleField(field, true);
  }

  toggleValidation(field: Field) {
    const validated = !field.is_validated;
    field.is_validated = validated;
    field.is_rejected  = false;

    this.scanService.validateField(field.id, validated).subscribe({
      next: () => {},
      error: (err) => { this.errorMessage = err.error?.message || 'Erreur'; },
    });
  }



  // ── Articles ─────────────────────────────────────────────

  updateArticles() {
    // Supporte les deux formats : lignes_ et article_
    const prefix = this.fields.some(f => f.field_name.startsWith('lignes_'))
      ? 'lignes' : 'article';

    const articleFields = this.fields.filter(f => f.field_name.startsWith(prefix + '_'));
    if (articleFields.length === 0) { this.articles = []; return; }

    const nums = [...new Set(
      articleFields.map(f => f.field_name.split('_')[1])
    )].sort((a, b) => Number(a) - Number(b));

    this.articles = nums.map(num => ({
      num,
      code  : this.fields.find(f => f.field_name === `${prefix}_${num}_code`)          || null,
      desc  : this.fields.find(f => f.field_name === `${prefix}_${num}_description`)   || null,
      qte   : this.fields.find(f => f.field_name === `${prefix}_${num}_quantite`)      || null,
      pu    : this.fields.find(f => f.field_name === `${prefix}_${num}_prix_unitaire`) || null,
      total : this.fields.find(f =>
        f.field_name === `${prefix}_${num}_montant_ht` ||
        f.field_name === `${prefix}_${num}_total_ht`
      ) || null,
    }));
  }

  // ── Catégories ───────────────────────────────────────────

  getFieldsByCategory(category: string): Field[] {
    const dateKeys = ['date_emission', 'date_echeance', 'date_facturation', 'date_paiement'];

    const fournisseurKeys = [
      'numero_facture', 'fournisseur_nom', 'fournisseur_adresse',
      'fournisseur_identifiant_fiscal', 'fournisseur_telephone', 'fournisseur_email',
      'client_nom', 'client_adresse', 'client_identifiant_fiscal',
      'devise', 'fournisseur', 'client', 'email', 'telephone',
      'matricule_fiscale', 'taux_tva', 'numero_tva', 'registre_commerce',
    ];

 const totauxKeys = [
  'totaux_total_ht', 'totaux_total_tva', 'totaux_total_ttc',
  'totaux_remise', 'totaux_timbre',
  'total_ht', 'total_tva', 'total_ttc', 'remise',
  'timbre_fiscal', 'base_tva', 'tva_montant', 'tva', 'timbre',
];
    const prefix = this.fields.some(f => f.field_name.startsWith('lignes_')) ? 'lignes_' : 'article_';

    if (category === 'date') {
      return this.fields.filter(f => dateKeys.includes(f.field_name));
    }

    if (category === 'fournisseur') {
      return this.fields.filter(f =>
        fournisseurKeys.includes(f.field_name) && !dateKeys.includes(f.field_name)
      );
    }

    if (category === 'totaux') {
      return this.fields.filter(f => totauxKeys.includes(f.field_name));
    }

    if (category === 'autres') {
      const allKnown = [...dateKeys, ...fournisseurKeys, ...totauxKeys];
      return this.fields.filter(f =>
        !allKnown.includes(f.field_name) &&
        !f.field_name.startsWith('lignes_') &&
        !f.field_name.startsWith('article_')
      );
    }

    return [];
  }

  // ── Actions ──────────────────────────────────────────────

 downloadExcel() {
  if (!this.scan) return;

  const wb = XLSX.utils.book_new();

  // ── Feuille 1 : Informations générales ──
  const infoData: any[][] = [
    ['RAPPORT DE SCAN — ScanDoc'],
    [],
    ['Document', this.scan.filename],
    ['Scan ID', this.scan.id],
    ['Date scan', new Date(this.scan.createdAt).toLocaleDateString('fr-FR')],
    ['Statut', this.scan.status],
    [],
  ];

  // Ajoute tous les champs non-articles
  const nonArticleFields = this.fields.filter(f =>
    !f.field_name.startsWith('lignes_') && !f.field_name.startsWith('article_')
  );

  infoData.push(['Champ', 'Valeur', 'Validé']);
  nonArticleFields.forEach(f => {
    infoData.push([
      this.formatFieldName(f.field_name),
      f.corrected_value || f.field_value || '—',
      f.is_validated ? '✓' : ''
    ]);
  });

  const wsInfo = XLSX.utils.aoa_to_sheet(infoData);

  // Style largeurs colonnes
  wsInfo['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 10 }];

  XLSX.utils.book_append_sheet(wb, wsInfo, 'Informations');

  // ── Feuille 2 : Articles ──
  if (this.articles.length > 0) {
    const articlesData: any[][] = [
      ['#', 'Désignation', 'Quantité', 'Prix Unitaire', 'Total HT']
    ];

    this.articles.forEach(article => {
      articlesData.push([
        article.num,
        article.desc?.corrected_value || article.desc?.field_value || '—',
        article.qte?.corrected_value  || article.qte?.field_value  || '—',
        article.pu?.corrected_value   || article.pu?.field_value   || '—',
        article.total?.corrected_value|| article.total?.field_value|| '—',
      ]);
    });

    const wsArticles = XLSX.utils.aoa_to_sheet(articlesData);
    wsArticles['!cols'] = [
      { wch: 5 }, { wch: 50 }, { wch: 12 }, { wch: 15 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, wsArticles, 'Articles');
  }

  // ── Téléchargement ──
  const filename = `scan-${this.scan.id}-${this.scan.filename.replace(/\.[^.]+$/, '')}.xlsx`;
  XLSX.writeFile(wb, filename);
  
  this.snackBar.open('Fichier Excel exporté avec succès', 'Fermer', { duration: 3000, horizontalPosition: 'center', verticalPosition: 'bottom' });
}

  sendEmail() {
    if (!this.scan) return;
    const subject = encodeURIComponent(`Facture scannée #${this.scan.id}`);
    const body    = encodeURIComponent(`Bonjour,\n\nFacture #${this.scan.id} (${this.scan.filename}).\n\nCordialement`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    this.snackBar.open('Préparation de l\'email...', 'Fermer', { duration: 3000, horizontalPosition: 'center', verticalPosition: 'bottom' });
  }

  duplicateScan() {
    if (!this.scan) return;
    this.scanService.createScan(this.imageBase64, `copie_${this.scan.filename}`).subscribe({
      next: (res) => this.router.navigate(['/scans', res.data.scanId]),
      error: () => alert('Erreur lors de la duplication'),
    });
  }

  // ── Utilitaires ──────────────────────────────────────────

  formatFieldName(name: string): string {
    if (!name) return '';
    const customLabels: Record<string, string> = {
      'fournisseur_nom': 'Nom Fournisseur',
      'fournisseur_adresse': 'Adresse Fournisseur',
      'fournisseur_email': 'Email Fournisseur',
      'fournisseur_telephone': 'Téléphone Fournisseur',
      'fournisseur_identifiant_fiscal': 'Identifiant Fiscal Fournisseur',
      'client_nom': 'Nom Client',
      'client_adresse': 'Adresse Client',
      'client_identifiant_fiscal': 'Identifiant Fiscal Client',
      'numero_facture': 'Numéro de Facture',
      'date_emission': 'Date d\'Émission',
      'date_echeance': 'Date d\'Échéance',
      'date_facturation': 'Date de Facturation',
      'date_paiement': 'Date de Paiement',
      'matricule_fiscale': 'Matricule Fiscale',
      'taux_tva': 'Taux de TVA',
      'numero_tva': 'Numéro de TVA',
      'registre_commerce': 'Registre du Commerce',
      'totaux_total_ht': 'Total HT',
      'totaux_total_tva': 'Total TVA',
      'totaux_total_ttc': 'Total TTC',
      'totaux_remise': 'Remise',
      'totaux_timbre': 'Timbre',
      'total_ht': 'Total HT',
      'total_tva': 'Total TVA',
      'total_ttc': 'Total TTC',
      'timbre_fiscal': 'Timbre Fiscal',
      'base_tva': 'Base TVA',
      'tva_montant': 'Montant TVA',
      'devise': 'Devise',
      'telephone': 'Téléphone'
    };

    if (customLabels[name]) {
      return customLabels[name];
    }
    
    // Default fallback
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  isDateField(name: string): boolean {
    return name.toLowerCase().includes('date');
  }

  getFieldDisplay(name: string): string {
    const f = this.fields.find(x => x.field_name === name);
    return f?.corrected_value || f?.field_value || '—';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      completed: 'primary', pending: 'accent', failed: 'warn',
    };
    return colors[status] || 'default';
  }

  
}