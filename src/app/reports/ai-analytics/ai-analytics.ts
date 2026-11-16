import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Observable } from 'rxjs';
import {
  AnalyticsAssistantResponse,
  AnalyticsDemandForecast,
  AnalyticsDemandForecastResult,
  AnalyticsDemandSignal,
  AnalyticsInventoryInsights,
  AnalyticsOverview,
  AnalyticsSalesSummary,
  AnalyticsTopProducts,
} from '../../models/analytics.model';
import { MasterService } from '../../services/auth.service';

Chart.register(...registerables);

type AnalyticsSection =
  | 'overview'
  | 'sales'
  | 'topProducts'
  | 'forecast'
  | 'inventory'
  | 'signals';

@Component({
  selector: 'app-ai-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-analytics.html',
  styleUrl: './ai-analytics.css',
})
export class AiAnalytics implements AfterViewInit, OnDestroy {
  @ViewChild('salesCanvas') salesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topProductsCanvas') topProductsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('forecastCanvas') forecastCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('inventoryCanvas') inventoryCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('signalsCanvas') signalsCanvas!: ElementRef<HTMLCanvasElement>;

  startDate = '';
  endDate = '';
  groupBy: 'day' | 'week' | 'month' = 'day';
  forecastHorizon = 7;
  selectedForecastProductId: number | null = null;
  assistantQuestion = '';
  assistantResponse: AnalyticsAssistantResponse | null = null;
  assistantLoading = false;
  assistantError = '';
  filterError = '';

  overview: AnalyticsOverview | null = null;
  salesSummary: AnalyticsSalesSummary | null = null;
  topProducts: AnalyticsTopProducts | null = null;
  demandForecast: AnalyticsDemandForecast | null = null;
  inventoryInsights: AnalyticsInventoryInsights | null = null;
  demandSignals: AnalyticsDemandSignal[] = [];

  loading: Record<AnalyticsSection, boolean> = {
    overview: true,
    sales: true,
    topProducts: true,
    forecast: true,
    inventory: true,
    signals: true,
  };

  errors: Record<AnalyticsSection, string> = {
    overview: '',
    sales: '',
    topProducts: '',
    forecast: '',
    inventory: '',
    signals: '',
  };

  private salesChart: Chart | null = null;
  private topProductsChart: Chart | null = null;
  private forecastChart: Chart | null = null;
  private inventoryChart: Chart | null = null;
  private signalsChart: Chart | null = null;

  constructor(private masterService: MasterService, private cdf: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    this.startDate = this.toDateInputValue(start);
    this.endDate = this.toDateInputValue(today);
    this.refreshReports();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  refreshReports(): void {
    if (!this.validateDateRange()) {
      return;
    }

    this.loadSection('overview', this.masterService.getAnalyticsOverview(this.startDate, this.endDate), data => {
      this.overview = data;
    });
    this.loadSection(
      'sales',
      this.masterService.getAnalyticsSalesSummary(this.startDate, this.endDate, this.groupBy),
      data => {
        this.salesSummary = data;
        this.renderSalesChart(data);
      }
    );
    this.loadSection(
      'topProducts',
      this.masterService.getAnalyticsTopProducts(this.startDate, this.endDate),
      data => {
        this.topProducts = data;
        this.renderTopProductsChart(data);
      }
    );
    this.loadSection(
      'forecast',
      this.masterService.getAnalyticsDemandForecast(this.forecastHorizon),
      data => {
        this.demandForecast = data;
        const selectedProductExists = data.results.some(
          result => result.product_id === this.selectedForecastProductId
        );
        if (!selectedProductExists) {
          this.selectedForecastProductId =
            data.results.find(result => result.forecast.length > 0)?.product_id
            ?? data.results[0]?.product_id
            ?? null;
        }
        this.renderForecastChart();
      }
    );
    this.loadSection('inventory', this.masterService.getAnalyticsInventoryInsights(), data => {
      this.inventoryInsights = data;
      this.renderInventoryChart(data);
    });
    this.loadSection('signals', this.masterService.getAnalyticsDemandSignals(), data => {
      this.demandSignals = data;
      this.renderSignalsChart(data);
    });
  }

  askAssistant(): void {
    this.assistantError = '';
    this.assistantResponse = null;
    if (!this.validateDateRange()) {
      this.assistantError = this.filterError;
      return;
    }

    const question = this.assistantQuestion.trim();
    if (!question) {
      this.assistantError = 'Enter a question about the reports.';
      return;
    }

    this.assistantLoading = true;
    this.masterService.askAnalyticsAssistant({
      question,
      start_date: this.startDate,
      end_date: this.endDate,
    }).subscribe({
      next: response => {
        this.assistantResponse = response;
        this.assistantLoading = false;
        this.cdf.detectChanges();
      },
      error: error => {
        console.error('Failed to ask the analytics assistant', error);
        this.assistantError = this.getAssistantErrorMessage(error.status);
        this.assistantLoading = false;
        this.cdf.detectChanges();
      },
    });
  }

  onForecastProductChange(): void {
    this.renderForecastChart();
  }

  get selectedForecast(): AnalyticsDemandForecastResult | null {
    return this.demandForecast?.results.find(
      result => result.product_id === this.selectedForecastProductId
    ) ?? null;
  }

  get lowStockPercent(): number {
    const inventory = this.overview?.inventory;
    return inventory?.total_products
      ? Math.round((inventory.low_stock_count / inventory.total_products) * 100)
      : 0;
  }

  get searchSignalCount(): number {
    return this.demandSignals.filter(signal => signal.signal_type === 'SEARCH').length;
  }

  get addToCartSignalCount(): number {
    return this.demandSignals.filter(signal => signal.signal_type === 'ADD_TO_CART').length;
  }

  formatMoney(value: string | number | null | undefined): string {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return '—';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  }

  private loadSection<T>(
    section: AnalyticsSection,
    request: Observable<T>,
    onSuccess: (data: T) => void
  ): void {
    this.loading[section] = true;
    this.errors[section] = '';
    request.subscribe({
      next: data => {
        onSuccess(data);
        this.loading[section] = false;
        this.cdf.detectChanges();
      },
      error: error => {
        console.error(`Failed to load analytics ${section}`, error);
        this.errors[section] = 'Unable to load this report. Please try again.';
        this.loading[section] = false;
        this.cdf.detectChanges();
      },
    });
  }

  private validateDateRange(): boolean {
    this.filterError = '';
    if (!this.startDate || !this.endDate || this.startDate > this.endDate) {
      this.filterError = 'Choose a valid date range. The start date must be on or before the end date.';
      return false;
    }

    const start = Date.parse(`${this.startDate}T00:00:00Z`);
    const end = Date.parse(`${this.endDate}T00:00:00Z`);
    const today = Date.parse(`${this.toDateInputValue(new Date())}T00:00:00Z`);
    if (end > today) {
      this.filterError = 'The end date cannot be in the future.';
      return false;
    }
    if ((end - start) / 86_400_000 + 1 > 366) {
      this.filterError = 'Date ranges cannot exceed 366 days.';
      return false;
    }
    return true;
  }

  private getAssistantErrorMessage(status: number): string {
    if (status === 503) {
      return 'The analytics assistant is disabled on the server. Reports are still available.';
    }
    if (status === 502) {
      return 'The AI model is unavailable or returned an invalid response. Please try again later.';
    }
    if (status === 504) {
      return 'The AI model timed out. Please try again.';
    }
    return 'Unable to get an explanation right now. Please try again.';
  }

  private renderSalesChart(data: AnalyticsSalesSummary): void {
    this.salesChart?.destroy();
    this.salesChart = new Chart(this.salesCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: data.periods.map(period => period.period),
        datasets: [{
          label: 'Order revenue',
          data: data.periods.map(period => Number(period.order_revenue)),
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.12)',
          fill: true,
          tension: 0.32,
        }],
      },
      options: this.chartOptions(),
    });
  }

  private renderTopProductsChart(data: AnalyticsTopProducts): void {
    this.topProductsChart?.destroy();
    this.topProductsChart = new Chart(this.topProductsCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: data.results.map(product => product.product_name),
        datasets: [{
          label: 'Item subtotal',
          data: data.results.map(product => Number(product.item_subtotal)),
          backgroundColor: '#818cf8',
          borderRadius: 6,
        }],
      },
      options: {
        ...this.chartOptions(),
        indexAxis: 'y',
        plugins: { legend: { display: false } },
      },
    });
  }

  private renderForecastChart(): void {
    this.forecastChart?.destroy();
    const forecast = this.selectedForecast;
    if (!forecast?.forecast.length) {
      return;
    }
    this.forecastChart = new Chart(this.forecastCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: forecast.forecast.map(day => day.date),
        datasets: [{
          label: 'Estimated units',
          data: forecast.forecast.map(day => Number(day.predicted_units)),
          borderColor: '#0891b2',
          backgroundColor: 'rgba(8, 145, 178, 0.12)',
          fill: true,
          tension: 0.25,
        }],
      },
      options: this.chartOptions(),
    });
  }

  private renderInventoryChart(data: AnalyticsInventoryInsights): void {
    this.inventoryChart?.destroy();
    this.inventoryChart = new Chart(this.inventoryCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: data.results.slice(0, 10).map(item => item.product_name),
        datasets: [{
          label: 'Available units',
          data: data.results.slice(0, 10).map(item => item.available_stock),
          backgroundColor: data.results.slice(0, 10).map(item =>
            item.is_low_stock ? '#f87171' : '#34d399'
          ),
          borderRadius: 6,
        }],
      },
      options: {
        ...this.chartOptions(),
        indexAxis: 'y',
        plugins: { legend: { display: false } },
      },
    });
  }

  private renderSignalsChart(data: AnalyticsDemandSignal[]): void {
    this.signalsChart?.destroy();
    const searchCount = data.filter(signal => signal.signal_type === 'SEARCH').length;
    const cartCount = data.filter(signal => signal.signal_type === 'ADD_TO_CART').length;
    this.signalsChart = new Chart(this.signalsCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Searches', 'Add to cart'],
        datasets: [{
          data: [searchCount, cartCount],
          backgroundColor: ['#818cf8', '#34d399'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  private chartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom' as const },
      },
    };
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private destroyCharts(): void {
    this.salesChart?.destroy();
    this.topProductsChart?.destroy();
    this.forecastChart?.destroy();
    this.inventoryChart?.destroy();
    this.signalsChart?.destroy();
  }
}
