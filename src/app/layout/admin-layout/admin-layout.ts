import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval, Subject, startWith, switchMap, takeUntil } from 'rxjs';
import { MasterService } from '../../services/auth.service';

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
  private lastOrderIds = new Set<number>();
  private destroy$ = new Subject<void>();
  private notificationRepeatTimer: number | null = null;
  private notificationAudio: HTMLAudioElement | null = null;

  constructor(private masterService: MasterService) {}

  ngOnInit(): void {
    this.masterService.orderNotificationStop$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.dismissNotification());

    this.startAdminOrderPolling();
  }

  ngOnDestroy(): void {
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
        },
        error: err => console.error(err)
      });
  }

  showAdminNotification(newOrders: any[]) {
    const orderLabel = newOrders.length === 1
      ? `Order #${newOrders[0].id}`
      : `Orders ${newOrders.map(o => `#${o.id}`).join(', ')}`;

    this.notificationMessage = `New order received: ${orderLabel}`;
    this.notificationVisible = true;
    this.startNotificationSound();

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Order', {
        body: 'A new order has been placed.',
        icon: ''
      });
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
