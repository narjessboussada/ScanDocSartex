import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

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
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    MatFormFieldModule,
  ],
  templateUrl: './scan-upload.component.html',
  styleUrl: './scan-upload.component.css',
})
export class ScanUploadComponent {
scanService = inject(ScanService); // enlève "private"
  private router      = inject(Router);

  // État du composant
  selectedFile  : File | null = null;  // fichier sélectionné
  previewUrl    : string = '';         // aperçu de l'image
  isLoading     : boolean = false;     // true pendant l'appel API
  errorMessage  : string = '';         // message d'erreur
  documentType  : string = 'invoice';  // type de document choisi

  // ── Sélection d'une image depuis le disque ──────────────────
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.processFile(file);
  }

  // ── Drag & Drop ─────────────────────────────────────────────
  // dragover : l'utilisateur glisse un fichier au-dessus de la zone
  onDragOver(event: DragEvent) {
    event.preventDefault(); // empêche le comportement par défaut (ouvrir le fichier)
    event.stopPropagation();
  }

  // drop : l'utilisateur lâche le fichier dans la zone
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  // ── Traitement du fichier sélectionné ───────────────────────
  private processFile(file: File) {
    // Vérifie que c'est bien une image
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Please select an image file (JPG, PNG, etc.)';
      return;
    }

    // Vérifie la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'Image too large. Maximum size is 5MB.';
      return;
    }

    this.selectedFile  = file;
    this.errorMessage  = '';

    // Génère un aperçu de l'image avec FileReader
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
    this.errorMessage = '';
  }

  // ── Envoi au backend ─────────────────────────────────────────
onSubmit() {
  if (!this.selectedFile || !this.previewUrl) return;

  this.isLoading    = true;
  this.errorMessage = '';

  this.scanService.createScan(this.previewUrl, this.selectedFile.name).subscribe({
    next: (res) => {
      const scanId = res.data.scanId;
      this.router.navigate(['/scans', scanId]);
    },
    error: (err) => {
      this.errorMessage = err.error?.message || 'Scan failed. Please try again.';
      this.isLoading = false;
    },
  });
}
}