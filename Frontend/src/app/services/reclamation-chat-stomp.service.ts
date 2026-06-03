import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import SockJS from 'sockjs-client';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { environment } from 'src/environments/environment';
import { Message } from './reclamation.service';

/** vnement inbox contribuable : nouveau message agent (hors fil ouvert). */
export interface ReclamationInboxEvent {
  reclamationId: number;
  type: string;
}

/**
 * Temps rel messagerie rclamation (STOMP + SockJS).
 * Deux abonnements possibles en parallle : chat d'une rclamation + inbox utilisateur.
 */
@Injectable({ providedIn: 'root' })
export class ReclamationChatStompService implements OnDestroy {
  private client: Client | null = null;
  private chatSub: StompSubscription | null = null;
  private inboxSub: StompSubscription | null = null;
  private readonly chatIncoming = new Subject<Message>();
  private readonly inboxIncoming = new Subject<ReclamationInboxEvent>();
  private activeReclamationId: number | null = null;
  private pendingReclamationId: number | null = null;
  private pendingInboxSuffix: string | null = null;

  ngOnDestroy(): void {
    this.stop();
  }

  /** Mme encodage que {@code ReclamationService.reclamationInboxTopicSuffix} ct Java. */
  static inboxTopicSuffixFromEmail(email: string): string {
    const normalized = email.trim().toLowerCase();
    const bytes = new TextEncoder().encode(normalized);
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return b64;
  }

  /** S'abonne au fil d'une rclamation (messagerie ouverte). */
  watch(reclamationId: number): Observable<Message> {
    this.pendingReclamationId = reclamationId;
    this.activeReclamationId = reclamationId;
    this.chatSub?.unsubscribe();
    this.chatSub = null;

    const c = this.getOrCreateClient();
    if (c.connected) {
      this.attachChatSubscription();
    } else {
      c.activate();
    }
    return this.chatIncoming.asObservable();
  }

  /**
   * Notifications  nouveau message agent  pour le contribuable (liste des rclamations).
   * Reste actif pendant louverture du chat dune autre rclamation.
   */
  watchContribuableInbox(userEmail: string): Observable<ReclamationInboxEvent> {
    const suffix = ReclamationChatStompService.inboxTopicSuffixFromEmail(userEmail);
    this.pendingInboxSuffix = suffix;
    this.inboxSub?.unsubscribe();
    this.inboxSub = null;

    const c = this.getOrCreateClient();
    if (c.connected) {
      this.attachInboxSubscription();
    } else {
      c.activate();
    }
    return this.inboxIncoming.asObservable();
  }

  /** Arrte uniquement labonnement au fil de messagerie (garde linbox si prsent). */
  stopChat(): void {
    this.activeReclamationId = null;
    this.pendingReclamationId = null;
    this.chatSub?.unsubscribe();
    this.chatSub = null;
  }

  /** Arrte inbox + chat et ferme la connexion WebSocket. */
  stop(): void {
    this.stopChat();
    this.pendingInboxSuffix = null;
    this.inboxSub?.unsubscribe();
    this.inboxSub = null;
    this.client?.deactivate();
    this.client = null;
  }

  private getOrCreateClient(): Client {
    if (this.client) {
      return this.client;
    }
    const url = this.sockJsUrl();
    this.client = new Client({
      webSocketFactory: () => new SockJS(url) as any,
      reconnectDelay: 5000,
      debug: () => {},
    });
    this.client.onConnect = () => {
      this.attachChatSubscription();
      this.attachInboxSubscription();
    };
    this.client.onWebSocketClose = () => {
      this.chatSub = null;
      this.inboxSub = null;
    };
    return this.client;
  }

  private attachChatSubscription(): void {
    this.chatSub?.unsubscribe();
    this.chatSub = null;
    const id = this.pendingReclamationId;
    if (id == null || this.client == null || !this.client.connected) {
      return;
    }
    this.activeReclamationId = id;
    this.chatSub = this.client.subscribe(`/topic/reclamation/${id}/messages`, (frame: IMessage) => {
      if (this.activeReclamationId !== id) {
        return;
      }
      try {
        const raw = JSON.parse(frame.body);
        this.chatIncoming.next(this.parseMessage(raw));
      } catch (e) {
        console.error('Messagerie STOMP: parse JSON', e);
      }
    });
  }

  private attachInboxSubscription(): void {
    this.inboxSub?.unsubscribe();
    this.inboxSub = null;
    const suffix = this.pendingInboxSuffix;
    if (suffix == null || this.client == null || !this.client.connected) {
      return;
    }
    this.inboxSub = this.client.subscribe(`/topic/reclamation/inbox/${suffix}`, (frame: IMessage) => {
      try {
        const raw = JSON.parse(frame.body);
        const rid = raw?.reclamationId;
        if (rid == null) {
          return;
        }
        this.inboxIncoming.next({
          reclamationId: Number(rid),
          type: String(raw?.type ?? ''),
        });
      } catch (e) {
        console.error('Inbox STOMP: parse JSON', e);
      }
    });
  }

  private sockJsUrl(): string {
    const explicit = (environment as { wsUrl?: string }).wsUrl;
    if (explicit) {
      return explicit.replace(/\/$/, '');
    }
    const base = environment.apiUrl.replace(/\/?api\/?$/, '').replace(/\/$/, '');
    return `${base}/ws`;
  }

  private parseMessage(raw: any): Message {
    const auteurRaw = raw?.auteur?.value ?? raw?.auteur ?? 'contribuable';
    const normalizedAuteur = `${auteurRaw}`.toLowerCase().includes('agent') ? 'agent' : 'contribuable';
    const rawDate = raw?.dateEnvoi ?? raw?.date;
    return {
      id: raw?.id,
      contenu: raw?.contenu ?? '',
      auteur: normalizedAuteur as 'contribuable' | 'agent',
      date: rawDate ? new Date(rawDate) : new Date(),
      lu: raw?.lu ?? false,
      pieceJointe: raw?.pieceJointe,
    };
  }
}
