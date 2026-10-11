import { Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ScanService } from '../../../core/services/scan.service';

@Component({
  selector: 'app-scan-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule],
  templateUrl: './scan-upload.component.html',
  styleUrls: ['./scan-upload.component.css'],
})
export class ScanUploadComponent implements OnDestroy {
  private router      = inject(Router);
  private scanService = inject(ScanService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly maxSize  = 5 * 1024 * 1024;                       // 5 Mo
  readonly accepted = ['image/jpeg', 'image/png', 'application/pdf'];

  file: File | null = null;
  previewUrl   = '';          // aperçu (images uniquement)
  baseName     = '';          // nom modifiable, sans extension
  ext          = '';
  dragging     = false;
  scanning     = false;
  elapsed      = 0;           // secondes écoulées pendant l'analyse
  errorMessage = '';

  private dataUrl = '';
  private timer: any;

  // ── Sélection du fichier ─────────────────────────────────

  browse() { if (!this.scanning) this.fileInput.nativeElement.click(); }

  onInput(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (input.files?.length) this.pick(input.files[0]);
    input.value = '';                                         // permet de re-choisir le même fichier
  }

  onDragOver(ev: DragEvent) { ev.preventDefault(); if (!this.scanning) this.dragging = true; }
  onDragLeave()             { this.dragging = false; }
  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.dragging = false;
    const f = ev.dataTransfer?.files?.[0];
    if (f && !this.scanning) this.pick(f);
  }

  private async pick(file: File) {
    this.errorMessage = '';
    if (!this.accepted.includes(file.type)) {
      this.errorMessage = 'Format non pris en charge. Utilisez un fichier JPG, PNG ou PDF.';
      return;
    }
    if (file.size > this.maxSize) {
      this.errorMessage = `Fichier trop volumineux (${this.formatSize(file.size)}). La limite est de 5 Mo.`;
      return;
    }

    try {
      this.dataUrl = await this.toDataUrl(file);
    } catch {
      this.errorMessage = 'Impossible de lire ce fichier. Réessayez avec un autre fichier.';
      return;
    }

    const i = file.name.lastIndexOf('.');
    this.file       = file;
    this.ext        = i > 0 ? file.name.slice(i) : '';
    this.baseName   = i > 0 ? file.name.slice(0, i) : file.name;
    this.previewUrl = file.type.startsWith('image/') ? this.dataUrl : '';
  }

  // ⚠ PDF : si ton ancien composant convertissait les PDF en images (page par page),
  //   remets cette conversion ici et renvoie l'image en data URL.
  private toDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  clear() {
    if (this.scanning) return;
    this.file = null; this.previewUrl = ''; this.dataUrl = '';
    this.baseName = ''; this.ext = ''; this.errorMessage = '';
  }

  // ── Analyse ──────────────────────────────────────────────

  scan() {
    if (!this.file || this.scanning) return;

    const base = this.baseName.trim().replace(/[\\/:*?"<>|]/g, '') || 'scan';
    this.scanning     = true;
    this.errorMessage = '';
    this.elapsed      = 0;
    this.timer = setInterval(() => this.elapsed++, 1000);

    this.scanService.createScan(this.dataUrl, base + this.ext).subscribe({
      next: (res: any) => {
        this.stopTimer();
        this.router.navigate(['/scans', res.data.scanId]);
      },
      error: (err: any) => {
        this.stopTimer();
        this.scanning = false;
        this.errorMessage = err?.error?.message || 'Impossible de lire le document. Vérifiez la qualité de l\'image et réessayez.';
      },
    });
  }

  back() { this.router.navigate(['/scans']); }

  // ── Affichage ────────────────────────────────────────────

  get clock(): string {
    const m = Math.floor(this.elapsed / 60), s = this.elapsed % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  get typeLabel(): string {
    return this.file?.type === 'application/pdf' ? 'Document PDF' : this.file?.type === 'image/png' ? 'Image PNG' : 'Image JPEG';
  }

  formatSize(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  }

  private stopTimer() { clearInterval(this.timer); }
  ngOnDestroy()       { this.stopTimer(); }
}