import { Component, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { MasterService } from '../../services/auth.service';

Chart.register(...registerables);

interface DailySales {
  online: number;
  store: number;
  total: number;
  onlineCount?: number;
  storeCount?: number;
  totalCount?: number;
}

const emptyDay: DailySales = {
  online: 0, store: 0, total: 0, onlineCount: 0, storeCount: 0, totalCount: 0,
};

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sales-report.html',
  styleUrls: ['./sales-report.css']
})
export class SalesReport implements OnInit, OnDestroy {

  @ViewChild('salesCanvas', { static: true }) salesCanvas!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart<'bar'>;
  private trendRequest?: Subscription;
  private readonly dayLabel = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  private readonly currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

  startDate: string = '';
  endDate: string = '';
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  constructor(private masterService: MasterService) {}

  ngOnInit(): void {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);

    this.endDate = this.localDateInputValue(today);
    this.startDate = this.localDateInputValue(past);
    this.loadSalesTrend();
  }

  ngOnDestroy(): void {
    this.trendRequest?.unsubscribe();
    this.chart?.destroy();
  }

  loadSalesTrend(): void {
    const { startDate, endDate } = this;
    this.trendRequest?.unsubscribe();
    this.chart?.destroy();
    this.chart = undefined;
    this.errorMessage.set('');

    if (!startDate || !endDate || startDate > endDate) {
      this.loading.set(false);
      this.errorMessage.set('Select a valid date range.');
      return;
    }

    this.loading.set(true);
    this.trendRequest = this.masterService.getSalesTrend(startDate, endDate).subscribe({
      next: data => {
        const salesByDate = new Map<string, DailySales>();
        for (const row of data) {
          const date = row.period.slice(0, 10);
          const total = Number(row.revenue);
          const store = Number(row.store_revenue ?? 0);
          const online = Number(row.online_revenue ?? total - store);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || ![online, store, total].every(Number.isFinite)) {
            this.loading.set(false);
            this.errorMessage.set('The report did not return valid daily sales figures.');
            return;
          }
          const previous = salesByDate.get(date);
          salesByDate.set(date, {
            online: (previous?.online ?? 0) + online,
            store: (previous?.store ?? 0) + store,
            total: (previous?.total ?? 0) + total,
            onlineCount: this.addCount(previous?.onlineCount, row.online_count ?? row.online_order_count),
            storeCount: this.addCount(previous?.storeCount, row.store_count ?? row.store_sale_count),
            totalCount: this.addCount(previous?.totalCount, row.transaction_count ?? row.order_count),
          });
        }

        const labels: string[] = [];
        const dailySales: DailySales[] = [];
        const end = new Date(endDate);
        for (const day = new Date(startDate); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
          labels.push(this.dayLabel.format(day));
          dailySales.push(salesByDate.get(day.toISOString().slice(0, 10)) ?? emptyDay);
        }

        this.renderChart(labels, dailySales);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Could not load daily sales. Please try again.');
      },
    });
  }

  private localDateInputValue(date: Date): string {
    const localTime = date.getTime() - date.getTimezoneOffset() * 60_000;
    return new Date(localTime).toISOString().slice(0, 10);
  }

  private addCount(previous: number | undefined, count: number | undefined): number | undefined {
    return count == null ? previous : (previous ?? 0) + Number(count);
  }

  private salesTooltip(label: string, revenue: number, count?: number): string {
    const transactions = count == null ? '' : ` · ${count} ${count === 1 ? 'transaction' : 'transactions'}`;
    return `${label}: ${this.currency.format(revenue)}${transactions}`;
  }

  private renderChart(labels: string[], dailySales: DailySales[]): void {
    this.chart = new Chart(this.salesCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Online sales',
          data: dailySales.map(day => day.online),
          backgroundColor: '#278534',
          maxBarThickness: 36,
          borderRadius: 3,
        }, {
          label: 'In-store sales',
          data: dailySales.map(day => day.store),
          backgroundColor: '#2563eb',
          maxBarThickness: 36,
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: context => {
                const day = dailySales[context.dataIndex];
                const count = context.datasetIndex === 0 ? day.onlineCount : day.storeCount;
                return this.salesTooltip(context.dataset.label ?? '', context.parsed.y ?? 0, count);
              },
              footer: ([context]) => {
                const day = dailySales[context.dataIndex];
                return this.salesTooltip('Combined', day.total, day.totalCount);
              },
            },
          },
        },
        scales: {
          x: { ticks: { maxRotation: 0, autoSkip: true } },
          y: {
            beginAtZero: true,
            ticks: { callback: value => this.currency.format(Number(value)) },
          },
        }
      }
    });
  }
  exportToExcel() {
  this.masterService.downloadSalesReport(this.startDate, this.endDate).subscribe({
    next: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales_report_${this.startDate}_to_${this.endDate}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    },
    error: (err) => console.error('Excel export failed', err)
  });
}
}
