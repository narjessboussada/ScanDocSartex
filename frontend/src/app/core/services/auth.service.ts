import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

@Injectable({ providedIn: 'root' }) // disponible dans toute l'app sans l'importer
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;

  // Stocke l'utilisateur connecté — null si pas connecté
  private currentUserSubject = new BehaviorSubject<User | null>(
    this.getUserFromStorage()
  );
  // $ = convention Angular pour un Observable
  currentUser$ = this.currentUserSubject.asObservable();

  login(email: string, password: string) {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res) => {
        // tap = exécute du code sans modifier la réponse
        const storage = this.getBrowserStorage();
        storage?.setItem('token', res.data.token);
        storage?.setItem('user', JSON.stringify(res.data.user));
        this.currentUserSubject.next(res.data.user); // notifie tous les composants
      })
    );
  }

  logout() {
    const storage = this.getBrowserStorage();
    storage?.removeItem('token');
    storage?.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    const storage = this.getBrowserStorage();
    return !!storage?.getItem('token'); // !! convertit en boolean
  }



  private getBrowserStorage(): Storage | null {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
      ? window.localStorage
      : null;
  }

  private getUserFromStorage(): User | null {
    const storage = this.getBrowserStorage();
    const user = storage?.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}