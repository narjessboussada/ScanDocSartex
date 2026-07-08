import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';
export interface Field {
  id: number;
  field_name: string;
  field_value: string;
  is_validated: boolean;
  is_rejected?: boolean;
  corrected_value: string | null;
}

export interface Qualite {
  niveau  : string;
  score   : number;
  message : string;
  conseil : string | null;
}


export interface Scan {
  id          : number;
  filename    : string;
  status      : string;
  rawText     : string;
  createdAt   : string;
  image_base64: string;
  qualite     ?: Qualite;
}
@Injectable({ providedIn: 'root' })
export class ScanService {
  private http   = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/scan`;

  // Envoie l'image base64 scannée au backend
  createScan(imageBase64: string, filename: string) {
    return this.http.post<any>(this.apiUrl, { image_base64: imageBase64, filename });
  }

  // Récupère l'historique des scans
 getHistory() {
  return this.http.get<any>(this.apiUrl).pipe(
    map((res: any) => {
      res.data.scans = res.data.scans.map((s: any) => ({
        ...s,
        createdAt: s.created_at
      }));
      return res;
    })
  );
}

// Envoie directement un JSON de facture (format API entreprise)
processJSON(jsonData: any, filename: string = 'facture.json') {
  return this.http.post<any>(`${this.apiUrl}/json`, {
    json_data: jsonData,
    filename
  });
}

  // Récupère un scan avec ses champs extraits
  getScanById(id: number) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Valide ou corrige un champ extrait
  validateField(fieldId: number, isValidated: boolean, correctedValue?: string) {
    return this.http.patch<any>(`${this.apiUrl}/fields/${fieldId}`, {
      is_validated: isValidated,
      corrected_value: correctedValue || null,
    });
  }

  deleteScan(id: number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}