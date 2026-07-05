import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// Angular Material — composants UI prêts à l'emploi
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true, // composant autonome — pas besoin de NgModule
  imports: [
    CommonModule,
    ReactiveFormsModule,    // pour utiliser les Reactive Forms
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  // inject() = nouvelle façon Angular d'injecter les dépendances
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private router      = inject(Router);

  // État du composant
  isLoading    = false;  // true pendant l'appel API → affiche le spinner
  errorMessage = '';     // message d'erreur si login échoue
  hidePassword = true;   // true = mot de passe masqué

  // Définition du formulaire avec ses règles de validation
  loginForm: FormGroup = this.fb.group({
    email: [
      '',                                        // valeur initiale
      [Validators.required, Validators.email],   // règles : obligatoire + format email
    ],
    password: [
      '',
      [Validators.required, Validators.minLength(6)],
    ],
  });

  // Raccourcis pour accéder aux champs dans le HTML
  get email()    { return this.loginForm.get('email');    }
  get password() { return this.loginForm.get('password'); }

  onSubmit() {
    // Si le formulaire a des erreurs → ne pas soumettre
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); // affiche les erreurs visuellement
      return;
    }

    this.isLoading    = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        // Login réussi → redirection vers les scans
        this.router.navigate(['/scans']);
      },
      error: (err) => {
        // Login échoué → afficher le message d'erreur
        this.errorMessage = err.error?.message || 'Login failed. Please try again.';
        this.isLoading = false;
      },
    });
  }
}