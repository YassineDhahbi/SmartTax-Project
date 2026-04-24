import { Component, OnInit } from '@angular/core';
import { PublicationService } from 'src/app/services/publication.service';

@Component({
  selector: 'app-actualite',
  templateUrl: './actualite.component.html',
  styleUrls: ['./actualite.component.css']
})
export class ActualiteComponent implements OnInit {
  readonly fallbackImage = 'assets/img/actualite/Actualite.png';
  publications: any[] = [];
  filteredPublications: any[] = [];
  searchTerm = '';
  sortOrder: 'newest' | 'oldest' = 'newest';
  publicationFilter: 'all' | 'favorites' = 'all';
  loading = false;
  currentPage = 1;
  readonly itemsPerPage = 6;
  favoritePublicationIds: number[] = [];
  pinnedPublicationIds: number[] = [];

  constructor(private publicationService: PublicationService) {}

  ngOnInit(): void {
    this.loadFavorites();
    this.loadPinnedPublications();
    this.loadPublications();
  }

  loadPublications(): void {
    this.loading = true;

    this.publicationService.getPublications({
      page: 0,
      size: 50,
      sortBy: 'createdAt',
      sortDir: 'desc',
      status: 'PUBLISHED'
    } as any).subscribe({
      next: (response: any) => {
        this.publications = response?.data || [];
        this.applyFiltersAndSort();
        this.currentPage = 1;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement actualites:', error);
        this.publications = [];
        this.filteredPublications = [];
        this.loading = false;
      }
    });
  }

  onSearchChange(): void {
    this.applyFiltersAndSort();
    this.currentPage = 1;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFiltersAndSort();
    this.currentPage = 1;
  }

  onSortChange(): void {
    this.applyFiltersAndSort();
    this.currentPage = 1;
  }

  onPublicationFilterChange(): void {
    this.applyFiltersAndSort();
    this.currentPage = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPublications.length / this.itemsPerPage));
  }

  get paginatedPublications(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredPublications.slice(start, end);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  getPublicationImage(publication: any): string {
    const url = (publication?.imageUrl || publication?.image_url || '').trim();
    if (!url) {
      return this.fallbackImage;
    }

    // Même logique que dashboard agent (publications-fiscales)
    if (url.startsWith('http')) {
      return url;
    }

    if (url.startsWith('uploads/publications/')) {
      return `http://localhost:8080/${url}`;
    }

    if (url.startsWith('/assets/')) {
      return `http://localhost:8080${url}`;
    }

    if (url.startsWith('assets/')) {
      return `http://localhost:8080/${url}`;
    }

    return url;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) {
      return;
    }
    img.src = this.fallbackImage;
  }

  getCreatorName(publication: any): string {
    return (
      publication?.createdByName ||
      publication?.created_by?.name ||
      publication?.createdBy?.name ||
      publication?.author ||
      'Auteur inconnu'
    );
  }

  getCommentsCount(publication: any): number {
    return Number(
      publication?.comments_count ??
      publication?.commentsCount ??
      publication?.comments?.length ??
      0
    );
  }

  getLikesCount(publication: any): number {
    return Number(publication?.likes_count ?? publication?.likesCount ?? 0);
  }

  getDislikesCount(publication: any): number {
    return Number(publication?.dislikes_count ?? publication?.dislikesCount ?? 0);
  }

  toggleFavorite(publication: any): void {
    const publicationId = Number(publication?.id);
    if (!publicationId) {
      return;
    }

    if (this.favoritePublicationIds.includes(publicationId)) {
      this.favoritePublicationIds = this.favoritePublicationIds.filter((id) => id !== publicationId);
    } else {
      this.favoritePublicationIds = [...this.favoritePublicationIds, publicationId];
    }

    localStorage.setItem('actualite_favorites', JSON.stringify(this.favoritePublicationIds));
    this.applyFiltersAndSort();
  }

  isFavorite(publication: any): boolean {
    const publicationId = Number(publication?.id);
    return !!publicationId && this.favoritePublicationIds.includes(publicationId);
  }

  togglePin(publication: any): void {
    const publicationId = Number(publication?.id);
    if (!publicationId) {
      return;
    }

    if (this.pinnedPublicationIds.includes(publicationId)) {
      this.pinnedPublicationIds = this.pinnedPublicationIds.filter((id) => id !== publicationId);
    } else {
      this.pinnedPublicationIds = [...this.pinnedPublicationIds, publicationId];
    }

    localStorage.setItem('actualite_pinned_publications', JSON.stringify(this.pinnedPublicationIds));
    // Mise à jour immédiate de l'affichage sans rechargement de page
    this.applyFiltersAndSort();
    this.currentPage = 1;
  }

  isPinned(publication: any): boolean {
    const publicationId = Number(publication?.id);
    const pinnedFromBackend = !!(publication?.isPinned ?? publication?.is_pinned);
    return pinnedFromBackend || (!!publicationId && this.pinnedPublicationIds.includes(publicationId));
  }

  formatDay(dateInput: any): string {
    const date = this.parseDate(dateInput);
    return date ? `${date.getDate()}`.padStart(2, '0') : '--';
  }

  formatMonth(dateInput: any): string {
    const date = this.parseDate(dateInput);
    return date
      ? date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
      : '---';
  }

  formatYear(dateInput: any): string {
    const date = this.parseDate(dateInput);
    return date ? `${date.getFullYear()}` : '----';
  }

  private parseDate(dateInput: any): Date | null {
    if (!dateInput) {
      return null;
    }
    const date = new Date(dateInput);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private sortPublications(publications: any[]): any[] {
    return publications.sort((a, b) => {
      const isPinnedA = this.isPinned(a) ? 1 : 0;
      const isPinnedB = this.isPinned(b) ? 1 : 0;
      if (isPinnedA !== isPinnedB) {
        return isPinnedB - isPinnedA; // épinglées toujours en premier
      }

      const dateA = this.parseDate(a?.createdAt || a?.created_at || a?.publishedAt || a?.published_at)?.getTime() || 0;
      const dateB = this.parseDate(b?.createdAt || b?.created_at || b?.publishedAt || b?.published_at)?.getTime() || 0;
      return this.sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }

  private loadFavorites(): void {
    try {
      const rawFavorites = localStorage.getItem('actualite_favorites');
      if (!rawFavorites) {
        this.favoritePublicationIds = [];
        return;
      }
      const parsed = JSON.parse(rawFavorites);
      this.favoritePublicationIds = Array.isArray(parsed) ? parsed.map((id) => Number(id)).filter((id) => !Number.isNaN(id)) : [];
    } catch {
      this.favoritePublicationIds = [];
    }
  }

  private loadPinnedPublications(): void {
    try {
      const rawPinned = localStorage.getItem('actualite_pinned_publications');
      if (!rawPinned) {
        this.pinnedPublicationIds = [];
        return;
      }
      const parsed = JSON.parse(rawPinned);
      this.pinnedPublicationIds = Array.isArray(parsed)
        ? parsed.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
        : [];
    } catch {
      this.pinnedPublicationIds = [];
    }
  }

  private applyFiltersAndSort(): void {
    const term = this.searchTerm.trim().toLowerCase();
    let publications = [...this.publications];

    if (this.publicationFilter === 'favorites') {
      publications = publications.filter((publication) => this.isFavorite(publication));
    }

    if (term) {
      publications = publications.filter((publication) => {
        const title = (publication.title || '').toLowerCase();
        const summary = (publication.summary || '').toLowerCase();
        const content = (publication.content || '').toLowerCase();
        return title.includes(term) || summary.includes(term) || content.includes(term);
      });
    }

    this.filteredPublications = this.sortPublications(publications);
  }

}
