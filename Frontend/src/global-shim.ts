/**
 * SockJS (et dépendances) référencent `global` comme en Node ; absent dans le navigateur.
 * Doit être chargé avant tout module qui importe sockjs-client / @stomp/stompjs.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).global = window;
