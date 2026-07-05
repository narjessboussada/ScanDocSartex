import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ValidatedCountPipe } from '../../../shared/pipes/validated-count.pipe';

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
import jsPDF from 'jspdf';

import { ScanService, Field, Scan, Qualite } from '../../../core/services/scan.service';

@Component({
  selector: 'app-scan-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatDividerModule,
    ValidatedCountPipe,
  ],
  templateUrl: './scan-detail.component.html',
  styleUrl: './scan-detail.component.css',
})
export class ScanDetailComponent implements OnInit {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private scanService = inject(ScanService);

  scan          : Scan | null = null;
  fields        : Field[]     = [];
  imageBase64   : string      = '';
  isLoading     : boolean     = true;
  errorMessage  : string      = '';
  showModal     : boolean     = false;
  isExporting   : boolean     = false;
  qualite       : Qualite | null = null;

  editingFieldId : number | null = null;
  editingValue   : string        = '';

  ngOnInit() {
    const id = parseInt(this.route.snapshot.paramMap.get('id') || '0');
    if (!id) {
      this.router.navigate(['/scans']);
      return;
    }
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
    this.scanService.validateField(field.id, true, this.editingValue).subscribe({
      next: () => {
        field.corrected_value = this.editingValue;
        field.is_validated    = true;
        this.editingFieldId   = null;
        this.editingValue     = '';
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur de sauvegarde';
      },
    });
  }

  cancelEdit() {
    this.editingFieldId = null;
    this.editingValue   = '';
  }

  // ── Validation ───────────────────────────────────────────

  validateField(field: Field) {
    this.scanService.validateField(field.id, true).subscribe({
      next: () => { field.is_validated = true; },
      error: (err) => { this.errorMessage = err.error?.message || 'Erreur'; },
    });
  }

  validateAll() {
    this.fields
      .filter(f => !f.is_validated)
      .forEach(field => this.validateField(field));
  }

  toggleValidation(field: Field) {
    const target = !field.is_validated;
    this.scanService.validateField(field.id, target).subscribe({
      next: () => { field.is_validated = target; },
      error: (err) => { this.errorMessage = err.error?.message || 'Erreur'; },
    });
  }

  // ── Actions ──────────────────────────────────────────────

  downloadPDF() {
    if (!this.scan) return;
    this.isExporting = true;

    const doc = new jsPDF();
    let y = 20;

    // En-tête
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapport de Scan — ScanDoc', 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Document : ${this.scan.filename}`, 14, y);
    y += 6;
    doc.text(
      `Scan #${this.scan.id} — ${new Date(this.scan.createdAt).toLocaleDateString('fr-FR')}`,
      14, y
    );
    y += 10;

    // Qualité OCR
    if (this.qualite) {
      doc.setTextColor(this.qualite.niveau === 'bon' ? 46 : 200, 125, 50);
      doc.text(`Qualité OCR : ${this.qualite.message} (${this.qualite.score}%)`, 14, y);
      y += 10;
    }

    doc.setTextColor(0);
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 10;

    // Champs
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Données extraites', 14, y);
    y += 8;

    doc.setFontSize(10);
    this.fields.forEach((field) => {
      if (y > 270) { doc.addPage(); y = 20; }

      const label = this.formatFieldName(field.field_name);
      const value = field.corrected_value || field.field_value || '—';

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text(`${label} :`, 14, y);

      doc.setFont('helvetica', 'normal');
      doc.text(value.substring(0, 80), 70, y);

      if (field.is_validated) {
        doc.setTextColor(46, 125, 50);
        doc.setFontSize(8);
        doc.text('✓', 185, y);
        doc.setFontSize(10);
        doc.setTextColor(0);
      }
      y += 7;
    });

    doc.save(`scan-${this.scan.id}-${this.scan.filename}.pdf`);
    this.isExporting = false;
  }

  sendEmail() {
    if (!this.scan) return;
    const subject = encodeURIComponent(`Facture scannée #${this.scan.id}`);
    const body    = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint la facture #${this.scan.id} (${this.scan.filename}).\n\nCordialement`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  duplicateScan() {
    if (!this.scan) return;
    this.scanService.createScan(
      this.imageBase64,
      `copie_${this.scan.filename}`
    ).subscribe({
      next: (res) => this.router.navigate(['/scans', res.data.scanId]),
      error: () => alert('Erreur lors de la duplication'),
    });
  }

  // ── Utilitaires ──────────────────────────────────────────

  parseRawText(rawText: string): { key: string; value: string }[] {
    if (!rawText) return [];
    return rawText.split('\n')
      .filter(l => l.trim())
      .map(line => {
        const match = line.match(/^(.+?)\s*[:\-]\s*(.+)$/);
        return match
          ? { key: match[1].trim(), value: match[2].trim() }
          : { key: '—', value: line.trim() };
      });
  }

  formatFieldName(name: string): string {
    if (!name) return '';
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  isDateField(name: string): boolean {
    return name.toLowerCase().includes('date');
  }

  getValidationPercent(): number {
    if (!this.fields?.length) return 0;
    return (this.fields.filter(f => f.is_validated).length / this.fields.length) * 100;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      completed : 'primary',
      pending   : 'accent',
      failed    : 'warn',
    };
    return colors[status] || 'default';
  }

  getFieldIcon(name: string): string {
    const icons: Record<string, string> = {
      invoice_number   : 'tag',
      date             : 'calendar_today',
      date_facturation : 'calendar_today',
      date_echeance    : 'event',
      total_ht         : 'payments',
      total_ttc        : 'account_balance_wallet',
      tva              : 'percent',
      amount           : 'attach_money',
      email            : 'email',
      phone            : 'phone',
      iban             : 'account_balance',
      siret            : 'business',
      fournisseur      : 'store',
      client           : 'person',
    };
    return icons[name] || 'label';
  }

  getQualiteColor(): string {
    if (!this.qualite) return '';
    switch (this.qualite.niveau) {
      case 'bon'    : return '#E8F5E9';
      case 'moyen'  : return '#FFFBEB';
      case 'faible' : return '#FEF2F2';
      case 'mauvais': return '#FEF2F2';
      default       : return '';
    }
  }
getFieldsByCategory(category: string): Field[] {
  const categories: Record<string, string[]> = {
    date: ['date', 'date_facturation', 'date_echeance', 'date_emission', 'date_paiement'],
    fournisseur: ['fournisseur', 'client', 'numero_facture', 'matricule_fiscale', 'email', 'telephone'],
    totaux: ['total_ht', 'remise', 'base_tva', 'taux_tva', 'tva_montant', 'tva', 'timbre_fiscal', 'total_ttc'],
    articles: ['description', 'designation', 'article', 'quantite', 'prix_unitaire'],
  };

  const catFields = categories[category] || [];

  if (category === 'autres') {
    const allCatFields = Object.values(categories).flat();
    return this.fields.filter(f => !allCatFields.some(c => f.field_name.toLowerCase().includes(c)));
  }

  return this.fields.filter(f =>
    catFields.some(c => f.field_name.toLowerCase().includes(c))
  );
}

getArticles(): { num: string, code: Field|null, desc: Field|null, qte: Field|null, pu: Field|null, total: Field|null }[] {
  const articleFields = this.fields.filter(f => f.field_name.startsWith('article_'));
  if (articleFields.length === 0) return [];

  const nums = [...new Set(
    articleFields.map(f => f.field_name.split('_')[1])
  )].sort((a, b) => Number(a) - Number(b));

  return nums.map(num => ({
    num,
    code  : this.fields.find(f => f.field_name === `article_${num}_code`)          || null,
    desc  : this.fields.find(f => f.field_name === `article_${num}_description`)   || null,
    qte   : this.fields.find(f => f.field_name === `article_${num}_quantite`)      || null,
    pu    : this.fields.find(f => f.field_name === `article_${num}_prix_unitaire`) || null,
    total : this.fields.find(f => f.field_name === `article_${num}_total_ht`)      || null,
  }));
}


  getQualiteTextColor(): string {
    if (!this.qualite) return '';
    switch (this.qualite.niveau) {
      case 'bon'    : return '#2E7D32';
      case 'moyen'  : return '#92400E';
      default       : return '#991B1B';
    }
  }
}