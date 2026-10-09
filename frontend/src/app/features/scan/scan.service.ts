import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ScanData {
  id: number;
  file_name: string;
  file_path: string;
  ocr_quality: number;
  created_at: string;
  extracted_data?: ExtractedData;
}

export interface ExtractedData {
  numero_facture?: string;
  date_emission?: string;
  fournisseur_nom?: string;
  client_nom?: string;
  total_ht?: string;
  total_tva?: string;
  total_ttc?: string;
  [key: string]: any; // Pour les autres champs dynamiques
}

@Injectable({ providedIn: 'root' })
export class ScanService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/scans`;

  // Upload une facture et attend les données extraites
  uploadFacture(file: File): Observable<{ scan: ScanData; extractedData: ExtractedData }> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<{ scan: ScanData; extractedData: ExtractedData }>(
      `${this.apiUrl}/upload`,
      formData
    );
  }

  // Récupère tous les scans
  getScans(): Observable<ScanData[]> {
    return this.http.get<ScanData[]>(this.apiUrl);
  }

  // Récupère un scan spécifique avec ses données
  getScanById(id: number): Observable<ScanData> {
    return this.http.get<ScanData>(`${this.apiUrl}/${id}`);
  }
}