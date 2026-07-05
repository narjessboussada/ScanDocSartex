import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ScanService, Scan } from '../../../core/services/scan.service';

@Component({
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './scan-list.component.html',
  styleUrl: './scan-list.component.css',
})
export class ScanListComponent implements OnInit {
  private scanService = inject(ScanService);
  private router      = inject(Router);

  scans        : Scan[]  = [];
  isLoading    : boolean = true;
  errorMessage : string  = '';

  displayedColumns = ['id', 'filename', 'status', 'createdAt', 'actions'];

  ngOnInit() {
    this.loadScans();
  }

  loadScans() {
    this.isLoading = true;
    this.scanService.getHistory().subscribe({
      next: (res) => {
        this.scans     = res.data.scans;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to load scans';
        this.isLoading    = false;
      },
    });
  }

  viewScan(id: number) {
    this.router.navigate(['/scans', id]);
  }

  deleteScan(id: number) {
    if (!confirm('Voulez-vous vraiment supprimer ce document scanné ?')) return;

    this.scanService.deleteScan(id).subscribe({
      next: () => {
        this.scans = this.scans.filter(s => s.id !== id);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete scan';
      },
    });
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      completed : 'primary',
      pending   : 'accent',
      failed    : 'warn',
    };
    return colors[status] || 'default';
  }
}