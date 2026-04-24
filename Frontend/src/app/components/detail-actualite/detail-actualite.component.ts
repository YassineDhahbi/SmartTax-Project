import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { PublicationService } from 'src/app/services/publication.service';

@Component({
  selector: 'app-detail-actualite',
  templateUrl: './detail-actualite.component.html',
  styleUrls: ['./detail-actualite.component.css']
})
export class DetailActualiteComponent implements OnInit {
  readonly fallbackImage = 'assets/img/actualite/Actualite.png';
  readonly fallbackCommentAvatar = '/assets/img/team/icondefaut.webp';
  commentImageTimestamp = Date.now();
  publication: any = null;
  relatedPublications: any[] = [];
  popularTags: string[] = [];
  comments: any[] = [];
  commentContent = '';
  commentError = '';
  commentNotice = '';
  commentNoticeType: 'success' | 'error' = 'error';
  isSubmittingComment = false;
  editingCommentId: number | null = null;
  editingCommentContent = '';
  commentToDelete: any | null = null;
  currentUserId: number | null = null;
  loading = false;
  errorMessage = '';
  userReaction: 'like' | 'dislike' | null = null;
  isSubmittingReaction = false;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private publicationService: PublicationService
  ) {}

  get isUserLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  ngOnInit(): void {
    const storedUserId = localStorage.getItem('userId');
    this.currentUserId = storedUserId ? Number(storedUserId) : null;
    this.route.queryParamMap.subscribe((params) => {
      const idParam = params.get('id');
      const publicationId = idParam ? Number(idParam) : NaN;

      if (!idParam || Number.isNaN(publicationId)) {
        this.errorMessage = 'Identifiant de publication invalide.';
        this.publication = null;
        return;
      }

      this.loadPublication(publicationId);
    });
  }

  loadPublication(id: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.publicationService.getPublicationById(id).subscribe({
      next: (response: any) => {
        this.publication = response;
        this.userReaction = this.getStoredReaction(Number(response?.id));
        this.loadComments(Number(response?.id));
        this.loadRelatedPublications(response);
        this.loadPopularTags();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement détail publication:', error);
        this.errorMessage = 'Impossible de charger les détails de cette publication.';
        this.publication = null;
        this.loading = false;
      }
    });
  }

  getPublicationImage(): string {
    return this.getImageUrlFromPublication(this.publication);
  }

  getRelatedPublicationImage(publication: any): string {
    return this.getImageUrlFromPublication(publication);
  }

  formatRelatedDate(publication: any): string {
    const dateInput = publication?.createdAt || publication?.created_at || publication?.publishedAt || publication?.published_at;
    const date = dateInput ? new Date(dateInput) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return 'Date inconnue';
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private getImageUrlFromPublication(publication: any): string {
    const url = (publication?.imageUrl || publication?.image_url || '').trim();
    if (!url) {
      return this.fallbackImage;
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
    const img = event.target as HTMLImageElement | null;
    if (img) {
      img.src = this.fallbackImage;
    }
  }

  getCreatorName(): string {
    return (
      this.publication?.createdByName ||
      this.publication?.created_by?.name ||
      this.publication?.createdBy?.name ||
      'Auteur inconnu'
    );
  }

  getCommentsCount(): number {
    if (this.comments.length > 0) {
      return this.comments.length;
    }
    return Number(
      this.publication?.comments_count ??
      this.publication?.commentsCount ??
      this.publication?.comments?.length ??
      0
    );
  }

  getLikesCount(): number {
    return Number(this.publication?.likes_count ?? this.publication?.likesCount ?? 0);
  }

  getDislikesCount(): number {
    return Number(this.publication?.dislikes_count ?? this.publication?.dislikesCount ?? 0);
  }

  getTags(): string[] {
    const tags = this.publication?.ai_generated_tags || this.publication?.aiGeneratedTags || [];
    return Array.isArray(tags) ? tags : [];
  }

  loadComments(publicationId: number): void {
    if (!publicationId) {
      this.comments = [];
      return;
    }

    this.publicationService.getPublicationComments(publicationId).subscribe({
      next: (response: any[]) => {
        this.comments = Array.isArray(response) ? response : [];
        this.commentImageTimestamp = Date.now();
        if (this.publication) {
          this.publication.commentsCount = this.comments.length;
          this.publication.comments_count = this.comments.length;
        }
      },
      error: (error) => {
        console.error('Erreur chargement commentaires:', error);
        this.comments = [];
      }
    });
  }

  submitComment(): void {
    if (!this.isUserLoggedIn || this.isSubmittingComment || !this.publication?.id) {
      return;
    }

    const content = this.commentContent.trim();
    if (!content) {
      this.commentError = 'Le commentaire ne doit pas être vide.';
      return;
    }

    this.commentError = '';
    this.clearCommentNotice();
    this.isSubmittingComment = true;
    this.publicationService.addPublicationComment(Number(this.publication.id), content).subscribe({
      next: (createdComment: any) => {
        this.comments = [createdComment, ...this.comments];
        this.commentImageTimestamp = Date.now();
        this.commentContent = '';
        if (this.publication) {
          this.publication.commentsCount = this.comments.length;
          this.publication.comments_count = this.comments.length;
        }
        this.showCommentNotice('Commentaire publié avec succès.', 'success');
        this.isSubmittingComment = false;
      },
      error: (error) => {
        console.error('Erreur ajout commentaire:', error);
        const backendMessage = this.getFriendlyCommentError(error, "Impossible d'ajouter le commentaire.");
        this.commentError = backendMessage;
        this.showCommentNotice(backendMessage, 'error');
        this.isSubmittingComment = false;
      }
    });
  }

  canManageComment(comment: any): boolean {
    if (!this.isUserLoggedIn || !this.currentUserId) {
      return false;
    }
    return Number(comment?.userId) === this.currentUserId;
  }

  startEditComment(comment: any): void {
    if (!this.canManageComment(comment)) {
      return;
    }
    this.editingCommentId = Number(comment.id);
    this.editingCommentContent = `${comment?.content || ''}`.trim();
    this.commentError = '';
  }

  cancelEditComment(): void {
    this.editingCommentId = null;
    this.editingCommentContent = '';
  }

  saveEditComment(comment: any): void {
    const publicationId = Number(this.publication?.id);
    const commentId = Number(comment?.id);
    const content = this.editingCommentContent.trim();

    if (!publicationId || !commentId || !content) {
      this.commentError = 'Le commentaire ne doit pas être vide.';
      return;
    }

    this.isSubmittingComment = true;
    this.clearCommentNotice();
    this.publicationService.updatePublicationComment(publicationId, commentId, content).subscribe({
      next: (updatedComment: any) => {
        this.comments = this.comments.map((item) =>
          Number(item?.id) === commentId ? { ...item, ...updatedComment } : item
        );
        this.cancelEditComment();
        this.showCommentNotice('Commentaire modifié avec succès.', 'success');
        this.isSubmittingComment = false;
      },
      error: (error) => {
        const backendMessage = this.getFriendlyCommentError(error, "Impossible de modifier ce commentaire.");
        this.commentError = backendMessage;
        this.showCommentNotice(backendMessage, 'error');
        this.isSubmittingComment = false;
      }
    });
  }

  deleteComment(comment: any): void {
    const publicationId = Number(this.publication?.id);
    const commentId = Number(comment?.id);
    if (!publicationId || !commentId) {
      return;
    }
    if (!this.canManageComment(comment)) {
      return;
    }

    this.isSubmittingComment = true;
    this.clearCommentNotice();
    this.publicationService.deletePublicationComment(publicationId, commentId).subscribe({
      next: () => {
        this.comments = this.comments.filter((item) => Number(item?.id) !== commentId);
        if (this.publication) {
          this.publication.commentsCount = this.comments.length;
          this.publication.comments_count = this.comments.length;
        }
        if (this.editingCommentId === commentId) {
          this.cancelEditComment();
        }
        this.commentToDelete = null;
        this.showCommentNotice('Commentaire supprimé avec succès.', 'success');
        this.isSubmittingComment = false;
      },
      error: () => {
        const backendMessage = "Impossible de supprimer ce commentaire.";
        this.commentError = backendMessage;
        this.showCommentNotice(backendMessage, 'error');
        this.isSubmittingComment = false;
      }
    });
  }

  askDeleteComment(comment: any): void {
    if (!this.canManageComment(comment)) {
      return;
    }
    this.commentToDelete = comment;
    this.commentError = '';
  }

  cancelDeleteComment(): void {
    this.commentToDelete = null;
  }

  confirmDeleteComment(): void {
    if (!this.commentToDelete) {
      return;
    }
    this.deleteComment(this.commentToDelete);
  }

  private showCommentNotice(message: string, type: 'success' | 'error'): void {
    this.commentNotice = message;
    this.commentNoticeType = type;
    setTimeout(() => {
      this.clearCommentNotice();
    }, 3500);
  }

  private clearCommentNotice(): void {
    this.commentNotice = '';
  }

  private getFriendlyCommentError(error: any, fallback: string): string {
    const raw = `${error?.error?.message || ''}`.trim();
    if (!raw) {
      return fallback;
    }
    if (raw.toLowerCase().includes('mots inappropries')) {
      return 'Votre commentaire contient des mots non autorisés. Merci de le reformuler.';
    }
    return raw;
  }

  formatCommentDate(comment: any): string {
    const value = comment?.createdAt || comment?.created_at;
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return 'Date inconnue';
    }
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCommentUserImage(comment: any): string {
    const rawPhoto = (
      comment?.photo ||
      comment?.userPhoto ||
      comment?.user_photo ||
      comment?.utilisateur?.photo ||
      ''
    );
    const photo = `${rawPhoto}`.trim();
    if (!photo) {
      return this.fallbackCommentAvatar;
    }
    return `${photo}?t=${this.commentImageTimestamp}`;
  }

  onCommentImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img) {
      img.src = this.fallbackCommentAvatar;
    }
  }

  onLike(): void {
    if (!this.publication || this.isSubmittingReaction) {
      return;
    }
    if (this.userReaction === 'like') {
      return;
    }
    this.submitReaction('like');
  }

  onDislike(): void {
    if (!this.publication || this.isSubmittingReaction) {
      return;
    }
    if (this.userReaction === 'dislike') {
      return;
    }
    this.submitReaction('dislike');
  }

  private submitReaction(type: 'like' | 'dislike'): void {
    const publicationId = Number(this.publication?.id);
    if (!publicationId) {
      return;
    }

    const previousReaction = this.userReaction;
    const previousLikes = this.getLikesCount();
    const previousDislikes = this.getDislikesCount();

    // Mise à jour instantanée côté UI (temps réel) avec bascule like/dislike
    if (type === 'like') {
      if (previousReaction === 'dislike') {
        this.setDislikesCount(Math.max(0, previousDislikes - 1));
      }
      this.setLikesCount(previousLikes + 1);
    } else {
      if (previousReaction === 'like') {
        this.setLikesCount(Math.max(0, previousLikes - 1));
      }
      this.setDislikesCount(previousDislikes + 1);
    }
    this.userReaction = type;

    this.isSubmittingReaction = true;
    const request$ = type === 'like'
      ? this.publicationService.likePublication(publicationId)
      : this.publicationService.dislikePublication(publicationId);

    request$.subscribe({
      next: (updatedPublication: any) => {
        this.publication = { ...this.publication, ...updatedPublication };
        this.userReaction = type;
        this.storeReaction(publicationId, type);
        this.isSubmittingReaction = false;
      },
      error: (error) => {
        console.error(`Erreur lors du ${type}:`, error);
        // Rollback si la requête backend échoue
        this.setLikesCount(previousLikes);
        this.setDislikesCount(previousDislikes);
        this.userReaction = previousReaction;
        this.isSubmittingReaction = false;
      }
    });
  }

  private setLikesCount(value: number): void {
    if (!this.publication) {
      return;
    }
    this.publication.likes_count = value;
    this.publication.likesCount = value;
  }

  private setDislikesCount(value: number): void {
    if (!this.publication) {
      return;
    }
    this.publication.dislikes_count = value;
    this.publication.dislikesCount = value;
  }

  private getReactionStorageKey(publicationId: number): string {
    const userId = localStorage.getItem('userId') || 'anonymous';
    return `publication_reaction_${userId}_${publicationId}`;
  }

  private storeReaction(publicationId: number, reaction: 'like' | 'dislike'): void {
    localStorage.setItem(this.getReactionStorageKey(publicationId), reaction);
  }

  private getStoredReaction(publicationId: number): 'like' | 'dislike' | null {
    if (!publicationId) {
      return null;
    }
    const stored = localStorage.getItem(this.getReactionStorageKey(publicationId));
    return stored === 'like' || stored === 'dislike' ? stored : null;
  }

  private loadRelatedPublications(currentPublication: any): void {
    const currentTags = this.extractTags(currentPublication);
    if (!currentPublication?.id || currentTags.length === 0) {
      this.relatedPublications = [];
      return;
    }

    this.publicationService.getPublications({
      page: 0,
      size: 100,
      sortBy: 'createdAt',
      sortDir: 'desc',
      status: 'PUBLISHED'
    } as any).subscribe({
      next: (response: any) => {
        const data = response?.data || [];
        this.relatedPublications = data
          .filter((item: any) => item?.id !== currentPublication.id)
          .filter((item: any) => this.hasCommonTag(currentTags, this.extractTags(item)))
          .slice(0, 3);
      },
      error: () => {
        this.relatedPublications = [];
      }
    });
  }

  private loadPopularTags(): void {
    this.publicationService.getPublications({
      page: 0,
      size: 200,
      sortBy: 'createdAt',
      sortDir: 'desc',
      status: 'PUBLISHED'
    } as any).subscribe({
      next: (response: any) => {
        const data = Array.isArray(response?.data) ? response.data : [];
        const counts = new Map<string, number>();

        data.forEach((item: any) => {
          this.extractTags(item).forEach((tag: string) => {
            counts.set(tag, (counts.get(tag) || 0) + 1);
          });
        });

        this.popularTags = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([tag]) => tag);
      },
      error: () => {
        this.popularTags = [];
      }
    });
  }

  private extractTags(publication: any): string[] {
    const tags = publication?.aiGeneratedTags || publication?.ai_generated_tags || [];
    return Array.isArray(tags)
      ? tags.map((tag: any) => `${tag}`.trim().toLowerCase()).filter((tag: string) => !!tag)
      : [];
  }

  private hasCommonTag(tagsA: string[], tagsB: string[]): boolean {
    if (!tagsA.length || !tagsB.length) {
      return false;
    }
    const setA = new Set(tagsA);
    return tagsB.some((tag) => setA.has(tag));
  }
}
