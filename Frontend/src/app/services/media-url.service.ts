import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

/**
 * URLs des fichiers uploades (profil, publications).
 * Ne pas utiliser pour les assets statiques Angular (/assets/img/team, etc.).
 */
@Injectable({ providedIn: 'root' })
export class MediaUrlService {

  resolve(url?: string | null): string {
    const raw = (url || '').trim();
    if (!raw) {
      return '';
    }
    if (raw.startsWith('data:') || raw.startsWith('blob:')) {
      return raw;
    }

    let path = raw;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const extracted = this.extractUploadPath(path);
      if (!extracted) {
        return '';
      }
      path = extracted;
    }

    path = path.startsWith('/') ? path : `/${path}`;

    if (path.startsWith('/assets/img/user/')) {
      const fileName = path.substring('/assets/img/user/'.length);
      path = `/uploads/users/${fileName}`;
    } else if (path.startsWith('/assets/img/publication/')) {
      const fileName = path.substring('/assets/img/publication/'.length);
      path = `/uploads/publications/${fileName}`;
    }

    if (path.startsWith('/uploads/')) {
      return this.toBackendAccessibleUrl(path);
    }

    return raw;
  }

  private extractUploadPath(absoluteUrl: string): string | null {
    const markers = ['/uploads/', '/assets/img/user/', '/assets/img/publication/'];
    for (const marker of markers) {
      const idx = absoluteUrl.indexOf(marker);
      if (idx >= 0) {
        return absoluteUrl.substring(idx);
      }
    }
    return null;
  }

  private toBackendAccessibleUrl(path: string): string {
    const base = environment.apiUrl.replace(/\/?api\/?$/, '').replace(/\/$/, '');
    if (!base || base.startsWith('/')) {
      return path;
    }
    return `${base}${path}`;
  }
}
