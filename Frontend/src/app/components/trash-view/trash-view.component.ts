import { Component, OnInit } from '@angular/core';
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

  constructor(private trashService: TrashService) {}

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
      expiringSoon: this.trashItems.filter(item => this.trashService.isExpiringSoon(item.deletedAt)).length,
      expired: this.trashItems.filter(item => this.trashService.isExpired(item.deletedAt)).length
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
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement cet élément ? Cette action est irréversible.')) {
      this.trashService.permanentDelete(trashId).subscribe({
        next: () => {
          this.loadTrashData();
          console.log('Élément supprimé définitivement');
        },
        error: (error) => {
          console.error('Erreur lors de la suppression définitive:', error);
        }
      });
    }
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
      // Restaurer tous les éléments sélectionnés
      const restorePromises = this.selectedItems.map(trashId => 
        this.trashService.restoreFromTrash(trashId).toPromise()
      );
      
      Promise.all(restorePromises).then(() => {
        this.loadTrashData();
        this.selectedItems = [];
        console.log('Éléments sélectionnés restaurés avec succès');
      }).catch((error) => {
        console.error('Erreur lors de la restauration multiple:', error);
      });
    }
  }

  deleteSelected(): void {
    if (this.selectedItems.length === 0) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement ${this.selectedItems.length} élément(s) ? Cette action est irréversible.`)) {
      // Supprimer tous les éléments sélectionnés
      const deletePromises = this.selectedItems.map(trashId => 
        this.trashService.permanentDelete(trashId).toPromise()
      );
      
      Promise.all(deletePromises).then(() => {
        this.loadTrashData();
        this.selectedItems = [];
        console.log('Éléments sélectionnés supprimés définitivement');
      }).catch((error) => {
        console.error('Erreur lors de la suppression multiple:', error);
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
}
