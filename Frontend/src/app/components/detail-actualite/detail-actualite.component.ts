import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PublicationService } from 'src/app/services/publication.service';

@Component({
  selector: 'app-detail-actualite',
  templateUrl: './detail-actualite.component.html',
  styleUrls: ['./detail-actualite.component.css']
})
export class DetailActualiteComponent implements OnInit {
  readonly fallbackImage = 'assets/img/actualite/Actualite.png';
  publication: any = null;
  loading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private publicationService: PublicationService
  ) {}

  ngOnInit(): void {
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
    const url = (this.publication?.imageUrl || this.publication?.image_url || '').trim();
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
}
