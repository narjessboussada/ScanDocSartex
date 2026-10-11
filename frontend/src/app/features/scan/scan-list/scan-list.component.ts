import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ScanService } from '../../../core/services/scan.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

type StatusFilter = 'all' | 'completed' | 'pending' | 'failed';

@Component({
  selector: 'app-scan-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule, MatSnackBarModule, ConfirmDialogComponent],
  templateUrl: './scan-list.component.html',
  styleUrls: ['./scan-list.component.css'],
})
export class ScanListComponent implements OnInit {
  private router      = inject(Router);
  private scanService = inject(ScanService);
  private snackBar    = inject(MatSnackBar);

  scans: any[] = [];
  isLoading    = true;
  errorMessage = '';

  search = '';
  filter: StatusFilter = 'all';
  page = 1;
  readonly pageSize = 10;

  ngOnInit() { this.load(); }

  load() {
    this.isLoading = true;
    this.errorMessage = '';

    // ⚠ Si ta méthode de liste a un autre nom que getScans(), change-la ici
    this.scanService.getHistory().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const list: any[] = Array.isArray(data) ? data : (data?.scans ?? []);
        // l'API renvoie created_at (SQL) ; on accepte aussi createdAt
        this.scans = list.map(s => ({ ...s, date: s.created_at || s.createdAt }));
        this.isLoading = false;
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'Impossible de charger les documents';
        this.isLoading = false;
      },
    });
  }

  // ── Filtres ──────────────────────────────────────────────

  count(f: StatusFilter): number {
    return f === 'all' ? this.scans.length : this.scans.filter(s => s.status === f).length;
  }

  setFilter(f: StatusFilter) { this.filter = f; this.page = 1; }
  onSearch() { this.page = 1; }

  get filtered(): any[] {
    const q = this.search.trim().toLowerCase().replace('#', '');
    return this.scans.filter(s =>
      (this.filter === 'all' || s.status === this.filter) &&
      (!q || String(s.filename).toLowerCase().includes(q) || String(s.id).includes(q) ||
             String(s.user_email || '').toLowerCase().includes(q))
    );
  }

  // ── Pagination ───────────────────────────────────────────

  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  get pageItems(): any[]   { const s = (this.page - 1) * this.pageSize; return this.filtered.slice(s, s + this.pageSize); }
  get from(): number       { return this.filtered.length ? (this.page - 1) * this.pageSize + 1 : 0; }
  get to(): number         { return Math.min(this.page * this.pageSize, this.filtered.length); }
  prev() { if (this.page > 1) this.page--; }
  next() { if (this.page < this.totalPages) this.page++; }

  // ── Actions ──────────────────────────────────────────────

  open(s: any) { this.router.navigate(['/scans', s.id]); }
  newScan()    { this.router.navigate(['/scans/new']); }   // ⚠ adapte à ta route « Nouveau scan »

  // ── Suppression avec confirmation ────────────────────────

  toDelete: any = null;      // scan en attente de confirmation
  deleting = false;

  remove(s: any, ev: Event) { ev.stopPropagation(); this.toDelete = s; }
  cancelDelete()            { if (!this.deleting) this.toDelete = null; }

  confirmDelete() {
    const s = this.toDelete;
    if (!s || this.deleting) return;
    this.deleting = true;

    // ⚠ Si ta méthode de suppression a un autre nom que deleteScan(), change-la ici
    this.scanService.deleteScan(s.id).subscribe({
      next: () => {
        this.scans = this.scans.filter(x => x.id !== s.id);
        if (this.page > this.totalPages) this.page = this.totalPages;
        this.deleting = false;
        this.toDelete = null;
        this.snackBar.open('Document supprimé', 'Fermer', { duration: 2000, horizontalPosition: 'center', verticalPosition: 'bottom' });
      },
      error: (err: any) => {
        this.deleting = false;
        this.toDelete = null;
        this.errorMessage = err?.error?.message || 'Suppression impossible';
      },
    });
  }

  // ── Affichage ────────────────────────────────────────────

  get hasUsers(): boolean { return this.scans.some(s => s.user_email); }

  statusLabel(status: string): string {
    return ({ completed: 'Terminé', pending: 'En attente', failed: 'Échoué' } as Record<string, string>)[status] || status;
  }

  fileIcon(name: string): string {
    return /\.pdf$/i.test(name || '') ? 'picture_as_pdf' : /\.json$/i.test(name || '') ? 'data_object' : 'image';
  }
}