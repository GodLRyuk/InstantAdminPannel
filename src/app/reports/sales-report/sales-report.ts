import { Component, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { MasterService } from '../../services/auth.service';

Chart.register(...registerables);

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
        const salesByDate = new Map<string, number>();
        for (const { period, revenue } of data) {
          const date = period.slice(0, 10);
          const amount = Number(revenue);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(amount)) {
            this.loading.set(false);
            this.errorMessage.set('The report did not return valid daily sales figures.');
            return;
          }
          salesByDate.set(date, (salesByDate.get(date) ?? 0) + amount);
        }

        const labels: string[] = [];
        const revenues: number[] = [];
        const end = new Date(endDate);
        for (const day = new Date(startDate); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
          labels.push(this.dayLabel.format(day));
          revenues.push(salesByDate.get(day.toISOString().slice(0, 10)) ?? 0);
        }

        this.renderChart(labels, revenues);
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

  private renderChart(labels: string[], revenues: number[]): void {
    this.chart = new Chart(this.salesCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Daily sales',
          data: revenues,
          backgroundColor: '#278534',
          maxBarThickness: 36,
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => this.currency.format(context.parsed.y ?? 0),
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
