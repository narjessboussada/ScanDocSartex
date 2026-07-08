import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

import { ScanService } from '../../../core/services/scan.service';

@Component({
  selector: 'app-scan-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    MatFormFieldModule,
  ],
  templateUrl: './scan-upload.component.html',
  styleUrls: ['./scan-upload.component.css'],
})
export class ScanUploadComponent {
scanService = inject(ScanService); 
  private router      = inject(Router);

  // État du composant
  selectedFile  : File | null = null;  // fichier sélectionné
  previewUrl    : string = '';         // aperçu de l'image
  isPdfPreview  : boolean = false;     // apercu PDF sans image
  isLoading     : boolean = false;     // true pendant l'appel API
  errorMessage  : string = '';         // message d'erreur
  documentType  : string = 'invoice';  // type de document choisi

  // ── Sélection d'une image ou d'un PDF depuis le disque ──────
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.processFile(file);
  }

  // ── Drag & Drop ─────────────────────────────────────────────
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  // ── Traitement du fichier sélectionné ───────────────────────
  private processFile(file: File) {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      this.errorMessage = 'Veuillez sélectionner un fichier JPG, PNG ou PDF.';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'Le fichier est trop volumineux. 5 Mo maximum.';
      return;
    }

    this.selectedFile = file;
    this.errorMessage = '';
    this.isPdfPreview = file.type === 'application/pdf';

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };
  }

  // ── Réinitialiser la sélection ───────────────────────────────
  resetSelection() {
    this.selectedFile = null;
    this.previewUrl   = '';
    this.isPdfPreview = false;
    this.errorMessage = '';
  }

  // ── Envoi au backend ─────────────────────────────────────────
  onSubmit() {
    if (!this.selectedFile) return;

    this.isLoading    = true;
    this.errorMessage = '';

    this.scanService.createScan(this.previewUrl, this.selectedFile.name).subscribe({
      next: (res) => {
        const scanId = res.data.scanId;
        this.router.navigate(['/scans', scanId]);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Échec du scan. Veuillez réessayer.';
        this.isLoading = false;
      },
    });
  }
}