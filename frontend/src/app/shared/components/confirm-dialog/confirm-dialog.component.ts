import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

/** Fenêtre de confirmation réutilisable (suppression, déconnexion…) */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css'],
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Confirmer';
  @Input() message = '';
  @Input() detail = '';                         // ex. nom du fichier concerné
  @Input() confirmLabel = 'Confirmer';
  @Input() cancelLabel = 'Annuler';
  @Input() icon = 'help_outline';
  @Input() tone: 'danger' | 'neutral' = 'neutral';
  @Input() busy = false;                        // action en cours : boutons désactivés

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('dialog') dialog?: ElementRef<HTMLElement>;

  // Le focus démarre sur « Annuler » : on évite de confirmer par erreur avec Entrée
  @ViewChild('cancelBtn') set cancelBtn(el: ElementRef<HTMLButtonElement> | undefined) {
    el?.nativeElement.focus();
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.open && !this.busy) this.cancelled.emit(); }

  onBackdrop() { if (!this.busy) this.cancelled.emit(); }

  /** Garde le focus dans la fenêtre tant qu'elle est ouverte */
  trap(ev: KeyboardEvent) {
    if (ev.key !== 'Tab' || !this.dialog) return;
    const items = Array.from(this.dialog.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled])'));
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const active = document.activeElement;
    if (ev.shiftKey && active === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && active === last) { ev.preventDefault(); first.focus(); }
  }
}