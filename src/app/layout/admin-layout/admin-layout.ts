import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { interval, Subject, startWith, switchMap, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService, MasterService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: false,
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.css']
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  reportsOpen = false;
  notificationVisible = false;
  notificationMessage = '';
  notificationPermission: NotificationPermission | 'unsupported' = 'default';
  private lastOrderIds = new Set<number>();
  private destroy$ = new Subject<void>();
  private notificationRepeatTimer: number | null = null;
  private notificationAudio: HTMLAudioElement | null = null;
  private restaurantOrderSocket: WebSocket | null = null;
  private restaurantSocketReconnectTimer: number | null = null;
  private reconnectRestaurantSocket = true;

  constructor(
    private masterService: MasterService,
    private authService: AuthService,
    private cdf: ChangeDetectorRef
  ) {}

  isPaymentStaff(): boolean {
    return this.authService.isStaff() && !this.authService.isRestaurant();
  }

  isRestaurant(): boolean {
    return this.authService.isRestaurant();
  }

  ngOnInit(): void {
    this.masterService.orderNotificationStop$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.dismissNotification());

    if (this.authService.isStaff()) {
      this.startAdminOrderPolling();
    } else if (this.authService.isRestaurant()) {
      this.updateNotificationPermission();
      this.startRestaurantOrderSocket();
    }
  }

  ngOnDestroy(): void {
    this.reconnectRestaurantSocket = false;
    if (this.restaurantSocketReconnectTimer !== null) {
      window.clearTimeout(this.restaurantSocketReconnectTimer);
    }
    this.restaurantOrderSocket?.close();
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleReports() {
    this.reportsOpen = !this.reportsOpen;
  }

  startAdminOrderPolling() {
    interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => this.masterService.getOrders()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (orders: any[]) => {
          const newOrders = orders || [];
          const newOrderIds = new Set<number>(newOrders.map(order => Number(order.id)));
          const newIncomingOrders = newOrders.filter(order => !this.lastOrderIds.has(Number(order.id)));
          const hasNewOrder = this.lastOrderIds.size > 0 && newIncomingOrders.length > 0;

          if (hasNewOrder) {
            this.showAdminNotification(newIncomingOrders);
            this.masterService.emitNewOrderIds(newIncomingOrders.map(o => Number(o.id)));
          }

          this.lastOrderIds = newOrderIds;
          this.cdf.detectChanges();
        },
        error: err => console.error(err)
      });
  }

  startRestaurantOrderSocket() {
    const ownerId = this.authService.getUserId();
    const accessToken = localStorage.getItem('token');
    if (!ownerId || !accessToken) {
      console.error('Cannot connect to restaurant order notifications: owner ID or access token is missing.');
      return;
    }

    const apiUrl = new URL(environment.apiUrl);
    const socketProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = new URL(
      `/ws/restaurant-owner/${encodeURIComponent(ownerId)}/`,
      `${socketProtocol}//${apiUrl.host}`
    );
    socketUrl.searchParams.set('token', accessToken);

    this.restaurantOrderSocket = new WebSocket(socketUrl);
    this.restaurantOrderSocket.onmessage = (message: MessageEvent<string>) => {
      this.handleRestaurantSocketMessage(message.data);
    };
    this.restaurantOrderSocket.onerror = (event) => {
      console.error('Restaurant order WebSocket error.', event);
    };
    this.restaurantOrderSocket.onclose = () => {
      this.restaurantOrderSocket = null;
      if (this.reconnectRestaurantSocket) {
        this.restaurantSocketReconnectTimer = window.setTimeout(
          () => this.startRestaurantOrderSocket(),
          3000
        );
      }
    };
  }

  private handleRestaurantSocketMessage(data: string) {
    try {
      const event: unknown = JSON.parse(data);
      if (!event || typeof event !== 'object' || !('type' in event) || event.type !== 'new_order' || !('order' in event)) {
        return;
      }

      const order = event.order;
      if (
        !order
        || typeof order !== 'object'
        || !('type' in order)
        || order.type !== 'restaurant_order_placed'
        || !('order_type' in order)
        || order.order_type !== 'restaurant'
        || !('status' in order)
        || order.status !== 'placed'
      ) {
        return;
      }

      const orderNumber = 'order_number' in order && typeof order.order_number === 'string'
        ? order.order_number
        : 'order_id' in order
          ? String(order.order_id)
          : 'new order';
      this.showRestaurantNotification(orderNumber);
    } catch (error) {
      console.error('Unable to parse restaurant order WebSocket event.', error);
    }
  }

  showAdminNotification(newOrders: any[]) {
    const orderLabel = newOrders.length === 1
      ? `Order #${newOrders[0].id}`
      : `Orders ${newOrders.map(o => `#${o.id}`).join(', ')}`;

    this.notificationMessage = `New order received: ${orderLabel}`;
    this.notificationVisible = true;
    this.startNotificationSound();

    this.showBrowserNotification('New Order', 'A new order has been placed.');
  }

  showRestaurantNotification(orderNumber: string) {
    this.notificationMessage = `New restaurant order: ${orderNumber}`;
    this.notificationVisible = true;
    this.startNotificationSound();
    this.showBrowserNotification('New Restaurant Order', orderNumber, false);
  }

  enableBrowserNotifications() {
    if (!('Notification' in window)) {
      this.notificationPermission = 'unsupported';
      return;
    }

    void Notification.requestPermission().then((permission) => {
      this.notificationPermission = permission;
    });
  }

  private updateNotificationPermission() {
    this.notificationPermission = 'Notification' in window
      ? Notification.permission
      : 'unsupported';
  }

  private showBrowserNotification(title: string, body: string, requestPermissionIfNeeded = true) {
    if (!('Notification' in window)) {
      return;
    }

    const show = () => {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    };

    if (requestPermissionIfNeeded && Notification.permission === 'default') {
      void Notification.requestPermission().then(show);
    } else {
      show();
    }
  }

  dismissNotification() {
    this.notificationVisible = false;
    this.stopNotificationSound();
  }

  startNotificationSound() {
    this.stopNotificationSound();

    const audioSrc = '/notification.mp3';
    this.notificationAudio = new Audio(audioSrc);
    this.notificationAudio.preload = 'auto';
    this.notificationAudio.muted = false;
    this.notificationAudio.volume = 0.8;

    const playAudio = () => {
      if (!this.notificationAudio) {
        return;
      }
      this.notificationAudio.currentTime = 0;
      this.notificationAudio.play().catch(err => {
        console.error('Notification audio play failed', err);
      });
    };

    playAudio();

    this.notificationRepeatTimer = window.setInterval(() => {
      playAudio();
    }, 10000);
  }

  stopNotificationSound() {
    if (this.notificationRepeatTimer !== null) {
      window.clearInterval(this.notificationRepeatTimer);
      this.notificationRepeatTimer = null;
    }

    if (this.notificationAudio) {
      this.notificationAudio.pause();
      this.notificationAudio.currentTime = 0;
      this.notificationAudio = null;
    }
  }
}
