import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Publication, PublicationResponse } from '../../models/publication.model';
import { PublicationService } from '../../services/publication.service';

@Component({
  selector: 'app-publication-admin',
  templateUrl: './publication-admin.component.html',
  styleUrls: ['./publication-admin.component.css']
})
export class PublicationAdminComponent implements OnInit {
  publications: Publication[] = [];
  filteredPublications: Publication[] = [];

  loading = false;
  errorMessage = '';
  searchTerm = '';
  selectedStatus: 'ALL' | Publication['status'] = 'ALL';

  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  itemsPerPage = 10;
  globalTotalPublications = 0;
  readonly defaultImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="100%" height="100%" fill="%23111827"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="12">No image</text></svg>';
  showPublicationDetailsModal = false;
  selectedPublicationForDetails: Publication | null = null;
  publicationComments: any[] = [];
  isLoadingPublicationComments = false;
  publicationCommentsError = '';
  deletingCommentId: number | null = null;
  updatingStatusPublicationId: number | null = null;
  showEditPublicationModal = false;
  selectedPublicationForEdit: Publication | null = null;
  editTitle = '';
  editContent = '';
  editImageUrl = '';
  editImagePreview = '';
  selectedEditImageFile: File | null = null;
  isSavingEdit = false;
  showDeletePublicationModal = false;
  selectedPublicationToDelete: Publication | null = null;
  isDeletingPublication = false;
  showReportsModal = false;
  selectedPublicationForReports: Publication | null = null;
  publicationReports: any[] = [];
  isLoadingPublicationReports = false;
  publicationReportsError = '';
  deletingReportedCommentId: number | null = null;
  showBlockAuthorModal = false;
  selectedReportForBlock: any | null = null;
  selectedBlockDuration = '24';
  customBlockHours = 24;
  blockReason = '';
  isBlockingAuthor = false;
  unblockingUserId: number | null = null;

  stats = [
    { title: 'Total publications', value: '0', subtitle: 'Toutes les publications', delta: '--', trend: 'neutral' },
    { title: 'Publiées', value: '0', subtitle: 'Statut PUBLISHED', delta: '--', trend: 'up' },
    { title: 'En attente', value: '0', subtitle: 'Statut PENDING', delta: '--', trend: 'neutral' },
    { title: 'Brouillon', value: '0', subtitle: 'Statut DRAFT', delta: '--', trend: 'down' }
  ];

  constructor(private publicationService: PublicationService) {}

  ngOnInit(): void {
    this.loadPublicationStats();
    this.loadPublications();
  }

  loadPublicationStats(): void {
    this.publicationService.getPublicationStats().subscribe({
      next: (stats) => {
        this.globalTotalPublications = stats?.total ?? 0;
        if (this.selectedStatus === 'ALL') {
          this.totalItems = this.globalTotalPublications;
          this.updateStats();
        }
      },
      error: () => {
        this.globalTotalPublications = 0;
      }
    });
  }

  loadPublications(page: number = 1): void {
    this.loading = true;
    this.errorMessage = '';
    this.currentPage = page;
    const apiPage = Math.max(this.currentPage - 1, 0);

    this.publicationService
      .getPublications({
        page: apiPage,
        limit: this.itemsPerPage,
        // Certains endpoints utilisent "size" au lieu de "limit".
        ...( { size: this.itemsPerPage } as any ),
        ...(this.selectedStatus !== 'ALL' ? { status: this.selectedStatus } : {})
      })
      .subscribe({
        next: (response: PublicationResponse) => {
          const pagination: any = response?.pagination ?? {};
          this.publications = response.data ?? [];
          this.filteredPublications = [...this.publications];
          this.totalPages = pagination.total_pages ?? pagination.totalPages ?? 1;
          const apiCurrentPage = pagination.current_page ?? pagination.currentPage;
          if (typeof apiCurrentPage === 'number' && !Number.isNaN(apiCurrentPage)) {
            this.currentPage = apiCurrentPage + 1;
          }
          const apiTotal =
            pagination.total_items ??
            pagination.totalItems ??
            pagination.total_elements ??
            pagination.totalElements;
          this.totalItems =
            this.selectedStatus === 'ALL'
              ? (this.globalTotalPublications || apiTotal || this.publications.length)
              : (apiTotal || this.publications.length);
          this.updateStats();
          this.applySearch();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Impossible de charger les publications.';
        }
      });
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.applySearch();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applySearch();
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatus = status as 'ALL' | Publication['status'];
    this.loadPublications(1);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.loadPublications(page);
  }

  getStartItem(): number {
    if (this.totalItems === 0 || this.filteredPublications.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndItem(): number {
    if (this.totalItems === 0 || this.filteredPublications.length === 0) {
      return 0;
    }

    const end = this.getStartItem() + this.filteredPublications.length - 1;
    return Math.min(end, this.totalItems);
  }

  getDisplayedCount(): number {
    return this.filteredPublications.length;
  }

  getAuthorName(publication: any): string {
    if (!publication) {
      return '-';
    }

    if (publication.createdByName) {
      return publication.createdByName;
    }

    const createdBy = publication.createdBy ?? publication.created_by;
    if (createdBy) {
      if (createdBy.firstName && createdBy.lastName) {
        return `${createdBy.firstName} ${createdBy.lastName}`;
      }
      if (createdBy.name) {
        return createdBy.name;
      }
      if (createdBy.email) {
        return createdBy.email.split('@')[0];
      }
    }

    if (publication.createdByEmail) {
      return publication.createdByEmail.split('@')[0];
    }

    return '-';
  }

  getPublicationImage(publication: Publication): string {
    const withAltShape = publication as Publication & { imageUrl?: string; image?: string };
    return withAltShape.imageUrl || publication.image_url || withAltShape.image || '';
  }

  getPublicationCreatedDate(publication: Publication): string {
    const withAltShape = publication as Publication & { createdAt?: string };
    return withAltShape.createdAt || publication.created_at || '';
  }

  getImageUrl(url?: string): string {
    if (!url) {
      return '';
    }

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
    const target = event.target as HTMLImageElement | null;
    if (!target) {
      return;
    }
    target.src = this.defaultImage;
  }

  viewPublication(publication: Publication): void {
    this.selectedPublicationForDetails = publication;
    this.showPublicationDetailsModal = true;
    this.loadPublicationComments(publication.id);
  }

  closePublicationDetailsModal(): void {
    this.showPublicationDetailsModal = false;
    this.selectedPublicationForDetails = null;
    this.publicationComments = [];
    this.publicationCommentsError = '';
    this.isLoadingPublicationComments = false;
  }

  editPublication(publication: Publication): void {
    this.selectedPublicationForEdit = publication;
    this.editTitle = publication.title || '';
    this.editContent = publication.content || '';
    this.editImageUrl = this.getPublicationImage(publication);
    this.editImagePreview = this.editImageUrl ? this.getImageUrl(this.editImageUrl) : '';
    this.selectedEditImageFile = null;
    this.showEditPublicationModal = true;
  }

  closeEditPublicationModal(): void {
    this.showEditPublicationModal = false;
    this.selectedPublicationForEdit = null;
    this.editTitle = '';
    this.editContent = '';
    this.editImageUrl = '';
    this.editImagePreview = '';
    this.selectedEditImageFile = null;
    this.isSavingEdit = false;
  }

  onEditImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.selectedEditImageFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.editImagePreview = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  removeEditImage(): void {
    this.selectedEditImageFile = null;
    this.editImagePreview = '';
    this.editImageUrl = '';
  }

  saveEditedPublication(): void {
    if (!this.selectedPublicationForEdit?.id) {
      return;
    }

    const title = this.editTitle.trim();
    const content = this.editContent.trim();
    if (!title || !content) {
      this.errorMessage = 'Le titre et le contenu sont obligatoires.';
      return;
    }

    this.isSavingEdit = true;
    const payload: any = {
      title,
      content
    };

    if (!this.selectedEditImageFile) {
      payload.image_url = this.editImageUrl || undefined;
    }

    const request$ = this.selectedEditImageFile
      ? this.publicationService.updatePublicationWithImage(this.selectedPublicationForEdit.id, payload, this.selectedEditImageFile)
      : this.publicationService.updatePublication(this.selectedPublicationForEdit.id, payload);

    request$.subscribe({
      next: (updatedPublication: Publication) => {
        const index = this.publications.findIndex((p) => p.id === updatedPublication.id);
        if (index !== -1) {
          this.publications[index] = updatedPublication;
        }
        this.applySearch();
        if (this.selectedPublicationForDetails?.id === updatedPublication.id) {
          this.selectedPublicationForDetails = updatedPublication;
        }
        this.isSavingEdit = false;
        this.closeEditPublicationModal();
      },
      error: () => {
        this.isSavingEdit = false;
        this.errorMessage = 'Impossible de modifier la publication pour le moment.';
      }
    });
  }

  updatePublicationStatusFromList(publication: Publication, nextStatus: 'DRAFT' | 'PUBLISHED'): void {
    if (!publication?.id || publication.status === nextStatus) {
      return;
    }

    this.updatingStatusPublicationId = publication.id;
    this.publicationService.updatePublicationStatus(publication.id, nextStatus).subscribe({
      next: (updatedPublication) => {
        const updatedStatus = updatedPublication?.status ?? nextStatus;
        publication.status = updatedStatus;
        if (this.selectedPublicationForDetails?.id === publication.id) {
          this.selectedPublicationForDetails = {
            ...this.selectedPublicationForDetails,
            status: updatedStatus
          };
        }
        this.updatingStatusPublicationId = null;
      },
      error: () => {
        this.errorMessage = 'Impossible de modifier le statut pour le moment.';
        this.updatingStatusPublicationId = null;
      }
    });
  }

  openDeletePublicationModal(publication: Publication): void {
    this.selectedPublicationToDelete = publication;
    this.showDeletePublicationModal = true;
  }

  closeDeletePublicationModal(): void {
    this.showDeletePublicationModal = false;
    this.selectedPublicationToDelete = null;
    this.isDeletingPublication = false;
  }

  confirmDeletePublication(): void {
    if (!this.selectedPublicationToDelete?.id) {
      return;
    }

    this.isDeletingPublication = true;
    this.publicationService.deletePublication(this.selectedPublicationToDelete.id).subscribe({
      next: () => {
        if (this.selectedPublicationForDetails?.id === this.selectedPublicationToDelete?.id) {
          this.closePublicationDetailsModal();
        }
        this.closeDeletePublicationModal();
        this.loadPublications(this.currentPage);
      },
      error: () => {
        this.errorMessage = 'Suppression impossible pour le moment.';
        this.isDeletingPublication = false;
      }
    });
  }

  openReportsModal(publication: Publication): void {
    this.selectedPublicationForReports = publication;
    this.showReportsModal = true;
    this.loadPublicationReports(publication.id);
  }

  closeReportsModal(): void {
    this.showReportsModal = false;
    this.selectedPublicationForReports = null;
    this.publicationReports = [];
    this.publicationReportsError = '';
    this.isLoadingPublicationReports = false;
    this.deletingReportedCommentId = null;
    this.closeBlockAuthorModal();
  }

  private loadPublicationComments(publicationId: number): void {
    this.isLoadingPublicationComments = true;
    this.publicationCommentsError = '';

    this.publicationService.getPublicationComments(publicationId).subscribe({
      next: (comments: any[]) => {
        this.publicationComments = Array.isArray(comments) ? comments : [];
        this.isLoadingPublicationComments = false;
      },
      error: () => {
        this.publicationComments = [];
        this.publicationCommentsError = 'Impossible de charger les commentaires.';
        this.isLoadingPublicationComments = false;
      }
    });
  }

  getLikesCount(publication: Publication): number {
    const extended = publication as Publication & { likesCount?: number };
    return extended.likesCount ?? publication.likes_count ?? 0;
  }

  getDislikesCount(publication: Publication): number {
    const extended = publication as Publication & { dislikesCount?: number };
    return extended.dislikesCount ?? publication.dislikes_count ?? 0;
  }

  getReportsCount(publication: Publication): number {
    const extended = publication as Publication & { reportsCount?: number; reports_count?: number };
    return Number(extended.reportsCount ?? extended.reports_count ?? 0);
  }

  getCommentAuthor(comment: any): string {
    if (comment?.userFullName) {
      return comment.userFullName;
    }
    if (comment?.userName) {
      return comment.userName;
    }
    if (comment?.authorName) {
      return comment.authorName;
    }
    if (comment?.utilisateur?.firstName && comment?.utilisateur?.lastName) {
      return `${comment.utilisateur.firstName} ${comment.utilisateur.lastName}`;
    }
    return comment?.utilisateur?.email || comment?.user?.name || comment?.user?.email || 'Utilisateur';
  }

  getCommentDate(comment: any): string {
    return this.formatDate(comment?.createdAt || comment?.created_at || comment?.updatedAt || comment?.updated_at);
  }

  getCommentSentimentLabel(comment: any): string {
    const raw = `${comment?.sentimentLabel || comment?.sentiment_label || 'NEUTRAL'}`.toUpperCase();
    if (raw === 'POSITIVE') {
      return 'Positif';
    }
    if (raw === 'NEGATIVE') {
      return 'Negatif';
    }
    return 'Neutre';
  }

  getCommentSentimentClass(comment: any): string {
    const raw = `${comment?.sentimentLabel || comment?.sentiment_label || 'NEUTRAL'}`.toUpperCase();
    if (raw === 'POSITIVE') {
      return 'comment-sentiment-badge--positive';
    }
    if (raw === 'NEGATIVE') {
      return 'comment-sentiment-badge--negative';
    }
    return 'comment-sentiment-badge--neutral';
  }

  getCommentId(comment: any): number | null {
    const id = comment?.id ?? comment?.idComment ?? comment?.commentId;
    return typeof id === 'number' ? id : null;
  }

  getReportAuthor(report: any): string {
    if (report?.userFullName) {
      return report.userFullName;
    }
    if (report?.userEmail) {
      return report.userEmail;
    }
    return 'Utilisateur';
  }

  getReportReason(report: any): string {
    return `${report?.reason || ''}`.trim() || 'Sans motif';
  }

  getReportDate(report: any): string {
    return this.formatDate(report?.createdAt || report?.created_at);
  }

  getReportType(report: any): 'COMMENT' | 'PUBLICATION' {
    return report?.type === 'COMMENT' ? 'COMMENT' : 'PUBLICATION';
  }

  getReportTypeLabel(report: any): string {
    return this.getReportType(report) === 'COMMENT' ? 'Commentaire' : 'Publication';
  }

  getCommentReportExcerpt(report: any): string {
    if (this.getReportType(report) !== 'COMMENT') {
      return '';
    }
    return `${report?.commentContent || ''}`.trim() || 'Commentaire non disponible';
  }

  getReportUserId(report: any): number | null {
    const id = report?.userId ?? report?.user_id;
    return typeof id === 'number' ? id : null;
  }

  isReportUserBlocked(report: any): boolean {
    if (this.getReportType(report) !== 'COMMENT') {
      return false;
    }
    const blocked = report?.isUserCommentBlocked ?? report?.is_user_comment_blocked;
    if (typeof blocked === 'boolean') {
      return blocked;
    }
    const blockedUntil = report?.userCommentBlockedUntil ?? report?.user_comment_blocked_until;
    if (!blockedUntil) {
      return false;
    }
    const untilMs = new Date(blockedUntil).getTime();
    return !Number.isNaN(untilMs) && untilMs > Date.now();
  }

  getReportCommentId(report: any): number | null {
    const id = report?.commentId ?? report?.comment_id;
    return typeof id === 'number' ? id : null;
  }

  deleteReportedComment(report: any): void {
    if (this.getReportType(report) !== 'COMMENT' || this.deletingReportedCommentId) {
      return;
    }

    const publicationId = this.selectedPublicationForReports?.id;
    const commentId = this.getReportCommentId(report);
    if (!publicationId || !commentId) {
      return;
    }

    this.deletingReportedCommentId = commentId;
    this.publicationReportsError = '';

    this.publicationService.deletePublicationComment(publicationId, commentId).subscribe({
      next: () => {
        this.publicationReports = this.publicationReports.filter((item) => {
          if (this.getReportType(item) !== 'COMMENT') {
            return true;
          }
          return this.getReportCommentId(item) !== commentId;
        });
        this.deletingReportedCommentId = null;
      },
      error: () => {
        this.publicationReportsError = 'Impossible de supprimer ce commentaire.';
        this.deletingReportedCommentId = null;
      }
    });
  }

  openBlockAuthorModal(report: any): void {
    if (this.getReportType(report) !== 'COMMENT') {
      return;
    }
    this.selectedReportForBlock = report;
    this.selectedBlockDuration = '24';
    this.customBlockHours = 24;
    this.blockReason = 'Commentaires abusifs';
    this.showBlockAuthorModal = true;
  }

  closeBlockAuthorModal(): void {
    if (this.isBlockingAuthor) {
      return;
    }
    this.showBlockAuthorModal = false;
    this.selectedReportForBlock = null;
    this.selectedBlockDuration = '24';
    this.customBlockHours = 24;
    this.blockReason = '';
    this.isBlockingAuthor = false;
  }

  onBlockDurationChange(value: string): void {
    this.selectedBlockDuration = value;
  }

  confirmBlockAuthorFromReport(): void {
    if (!this.selectedReportForBlock || this.isBlockingAuthor) {
      return;
    }
    const publicationId = this.selectedPublicationForReports?.id;
    const commentId = this.getReportCommentId(this.selectedReportForBlock);
    if (!publicationId || !commentId) {
      return;
    }

    const durationHours =
      this.selectedBlockDuration === 'custom'
        ? Number(this.customBlockHours)
        : Number(this.selectedBlockDuration);

    if (!durationHours || durationHours <= 0) {
      this.publicationReportsError = 'Veuillez choisir une duree valide de blocage.';
      return;
    }

    this.publicationReportsError = '';
    this.isBlockingAuthor = true;
    this.publicationService
      .blockPublicationCommentAuthor(publicationId, commentId, durationHours, this.blockReason.trim())
      .subscribe({
        next: () => {
          this.isBlockingAuthor = false;
          this.closeBlockAuthorModal();
        },
        error: () => {
          this.isBlockingAuthor = false;
          this.publicationReportsError = "Impossible de bloquer l'utilisateur pour le moment.";
        }
      });
  }

  unblockUserFromReport(report: any): void {
    const userId = this.getReportUserId(report);
    if (!userId || this.unblockingUserId) {
      return;
    }
    this.unblockingUserId = userId;
    this.publicationReportsError = '';

    this.publicationService.unblockUserComments(userId).subscribe({
      next: () => {
        this.unblockingUserId = null;
      },
      error: () => {
        this.unblockingUserId = null;
        this.publicationReportsError = "Impossible de debloquer l'utilisateur pour le moment.";
      }
    });
  }

  deleteComment(comment: any): void {
    const publicationId = this.selectedPublicationForDetails?.id;
    const commentId = this.getCommentId(comment);
    if (!publicationId || !commentId) {
      return;
    }

    this.deletingCommentId = commentId;
    this.publicationService.deletePublicationComment(publicationId, commentId).subscribe({
      next: () => {
        this.publicationComments = this.publicationComments.filter((item) => this.getCommentId(item) !== commentId);
        this.deletingCommentId = null;
      },
      error: (error: HttpErrorResponse) => {
        this.deletingCommentId = null;
        if (error.status === 403) {
          this.publicationCommentsError = 'Suppression refusee: seul le proprietaire du commentaire peut le supprimer.';
          return;
        }
        this.publicationCommentsError = 'Impossible de supprimer ce commentaire.';
      }
    });
  }

  private applySearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredPublications = [...this.publications];
      return;
    }

    this.filteredPublications = this.publications.filter((publication) =>
      publication.title?.toLowerCase().includes(term) ||
      publication.summary?.toLowerCase().includes(term) ||
      publication.slug?.toLowerCase().includes(term) ||
      publication.created_by?.name?.toLowerCase().includes(term)
    );
  }

  private loadPublicationReports(publicationId: number): void {
    this.isLoadingPublicationReports = true;
    this.publicationReportsError = '';
    this.publicationReports = [];

    this.publicationService.getPublicationReports(publicationId).subscribe({
      next: (response: any) => {
        const publicationReports = Array.isArray(response?.publicationReports)
          ? response.publicationReports.map((item: any) => ({ ...item, type: 'PUBLICATION' }))
          : [];
        const commentReports = Array.isArray(response?.commentReports)
          ? response.commentReports.map((item: any) => ({ ...item, type: 'COMMENT' }))
          : [];

        this.publicationReports = [...publicationReports, ...commentReports].sort((a: any, b: any) => {
          const timeA = new Date(a?.createdAt || a?.created_at || 0).getTime();
          const timeB = new Date(b?.createdAt || b?.created_at || 0).getTime();
          return timeB - timeA;
        });
        this.isLoadingPublicationReports = false;
      },
      error: () => {
        this.publicationReportsError = 'Impossible de charger les signalements.';
        this.isLoadingPublicationReports = false;
      }
    });
  }

  private updateStats(): void {
    const published = this.publications.filter((publication) => publication.status === 'PUBLISHED').length;
    const pending = this.publications.filter((publication) => publication.status === 'PENDING').length;
    const draft = this.publications.filter((publication) => publication.status === 'DRAFT').length;

    this.stats = [
      { ...this.stats[0], value: String(this.globalTotalPublications || this.totalItems) },
      { ...this.stats[1], value: String(published) },
      { ...this.stats[2], value: String(pending) },
      { ...this.stats[3], value: String(draft) }
    ];
  }

  getStatusClass(status: Publication['status']): string {
    switch (status) {
      case 'PUBLISHED':
      case 'VALIDATED':
        return 'statut-valide';
      case 'PENDING':
      case 'SCHEDULED':
        return 'statut-attente';
      case 'REJECTED':
      case 'DELETED':
        return 'statut-rejete';
      case 'ARCHIVED':
      case 'DRAFT':
      default:
        return 'statut-inactif';
    }
  }

  formatDate(dateValue?: string): string {
    if (!dateValue) {
      return '-';
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('fr-FR');
  }
}
