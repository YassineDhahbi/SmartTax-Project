import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TrashService, TrashItem, TrashStats } from '../../services/trash.service';

@Component({
  selector: 'app-trash-view',
  templateUrl: './trash-view.component.html',
  styleUrls: ['./trash-view.component.css']
})
export class TrashViewComponent implements OnInit {
  trashItems: TrashItem[] = [];
  trashStats: TrashStats = { totalItems: 0, expiringSoon: 0, expired: 0 };
  isLoading = false;
  selectedItems: string[] = [];
  sidebarOpen = false;

  constructor(
    private trashService: TrashService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTrashData();
  }

  loadTrashData(): void {
    this.isLoading = true;
    this.trashService.getTrashItems().subscribe({
      next: (items) => {
        this.trashItems = items;
        this.updateStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la corbeille:', error);
        this.isLoading = false;
      }
    });
  }

  updateStats(): void {
    this.trashStats = {
      totalItems: this.trashItems.length,
      expiringSoon: this.trashItems.filter(item => this.trashService.isExpiringSoon(new Date(item.deletedAt))).length,
      expired: this.trashItems.filter(item => this.trashService.isExpired(new Date(item.deletedAt))).length
    };
  }

  restoreItem(trashId: string): void {
    this.trashService.restoreFromTrash(trashId).subscribe({
      next: () => {
        this.loadTrashData();
        console.log('Élément restauré avec succès');
      },
      error: (error) => {
        console.error('Erreur lors de la restauration:', error);
      }
    });
  }

  permanentDeleteItem(trashId: string): void {
    // Créer une modal de confirmation moderne
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 16px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      text-align: center;
      animation: modalSlideIn 0.3s ease-out;
    `;
    
    modalContent.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 20px; color: #dc2626;">
        <i class="fa-solid fa-exclamation-triangle" style="font-size: 2.5rem; margin-right: 12px;"></i>
        <h3 style="margin: 0; font-size: 1.3rem; font-weight: 600;">Confirmation de suppression</h3>
      </div>
      <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">
        Êtes-vous sûr de vouloir supprimer définitivement cet élément ?<br>
        <strong style="color: #dc2626;">Cette action est irréversible.</strong>
      </p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="cancelDeleteBtn" style="
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          background: #f3f4f6;
          color: #666;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
        ">Annuler</button>
        <button id="confirmDeleteBtn" style="
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          background: #dc2626;
          color: white;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
        ">Supprimer définitivement</button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Animation d'entrée
    setTimeout(() => {
      modal.style.opacity = '1';
    }, 10);
    
    // Gestion des événements
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    const closeModal = () => {
      modal.style.opacity = '0';
      setTimeout(() => {
        if (modal && modal.parentNode) {
          document.body.removeChild(modal);
        }
      }, 300);
    };
    
    if (cancelBtn) {
      cancelBtn.onclick = closeModal;
    }
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        closeModal();
        this.trashService.permanentDelete(trashId).subscribe({
          next: () => {
            this.loadTrashData();
            console.log('Élément supprimé définitivement');
          },
          error: (error) => {
            console.error('Erreur lors de la suppression définitive:', error);
          }
        });
      };
    }
    
    // Fermeture au clic en dehors de la modal
    const handleClick = (e: MouseEvent) => {
      if (e.target === modal) {
        closeModal();
      }
    };
    
    modal.onclick = handleClick;
    
    // Fermeture avec la touche Échap
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    // Styles pour l'animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      #cancelDeleteBtn:hover {
        background: #e5e7eb !important;
        transform: translateY(-1px);
      }
      
      #confirmDeleteBtn:hover {
        background: #b91c1c !important;
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(220, 38, 38, 0.3);
      }
    `;
    document.head.appendChild(style);
  }

  emptyTrash(): void {
    if (confirm('Êtes-vous sûr de vouloir vider complètement la corbeille ? Cette action est irréversible.')) {
      this.trashService.emptyTrash().subscribe({
        next: () => {
          this.loadTrashData();
          console.log('Corbeille vidée avec succès');
        },
        error: (error) => {
          console.error('Erreur lors du vidage de la corbeille:', error);
        }
      });
    }
  }

  cleanExpiredItems(): void {
    this.trashService.cleanExpiredItems().subscribe({
      next: () => {
        this.loadTrashData();
        console.log('Éléments expirés nettoyés avec succès');
      },
      error: (error) => {
        console.error('Erreur lors du nettoyage des éléments expirés:', error);
      }
    });
  }

  toggleItemSelection(trashId: string): void {
    const index = this.selectedItems.indexOf(trashId);
    if (index > -1) {
      this.selectedItems.splice(index, 1);
    } else {
      this.selectedItems.push(trashId);
    }
  }

  selectAll(): void {
    if (this.selectedItems.length === this.trashItems.length) {
      this.selectedItems = [];
    } else {
      this.selectedItems = this.trashItems.map(item => item.id);
    }
  }

  restoreSelected(): void {
    if (this.selectedItems.length === 0) return;
    
    if (confirm(`Êtes-vous sûr de vouloir restaurer ${this.selectedItems.length} élément(s) ?`)) {
      this.trashService.restoreBatch(this.selectedItems).subscribe({
        next: () => {
          this.loadTrashData();
          this.selectedItems = [];
          console.log('Éléments sélectionnés restaurés avec succès');
        },
        error: (error) => {
          console.error('Erreur lors de la restauration multiple:', error);
        }
      });
    }
  }

  deleteSelected(): void {
    if (this.selectedItems.length === 0) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement ${this.selectedItems.length} élément(s) ? Cette action est irréversible.`)) {
      this.trashService.permanentDeleteBatch(this.selectedItems).subscribe({
        next: () => {
          this.loadTrashData();
          this.selectedItems = [];
          console.log('Éléments sélectionnés supprimés définitivement');
        },
        error: (error) => {
          console.error('Erreur lors de la suppression multiple:', error);
        }
      });
    }
  }

  getDaysRemainingClass(daysRemaining: number): string {
    if (daysRemaining === 0) return 'expired';
    if (daysRemaining <= 3) return 'expiring-soon';
    if (daysRemaining <= 7) return 'warning';
    return 'normal';
  }

  getDaysRemainingText(daysRemaining: number): string {
    if (daysRemaining === 0) return 'Expiré';
    if (daysRemaining === 1) return '1 jour restant';
    return `${daysRemaining} jours restants`;
  }

  getNomContribuable(item: TrashItem): string {
    if (item.data && item.data.nomContribuable) {
      return item.data.nomContribuable;
    }
    return 'N/A';
  }

  getTypeContribuable(item: TrashItem): string {
    if (item.data && item.data.typeContribuable) {
      return item.data.typeContribuable === 'PHYSIQUE' ? 'Personne physique' : 'Personne morale';
    }
    return 'N/A';
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'BROUILLON': return 'Brouillon';
      case 'SOUMIS': return 'Soumis';
      case 'EN_COURS_VERIFICATION': return 'En cours de vérification';
      case 'VALIDE': return 'Validé';
      case 'REJETE': return 'Rejeté';
      default: return status;
    }
  }

  goBack(): void {
    this.router.navigate(['/Dashboard-Agent']);
  }
}
