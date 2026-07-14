import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { MasterService } from '../../services/auth.service';

Chart.register(...registerables);

@Component({
  selector: 'app-sales-report',
  standalone: false,
  templateUrl: './sales-report.html',
  styleUrls: ['./sales-report.css']
})
export class SalesReport implements OnInit, AfterViewInit {

  @ViewChild('salesCanvas') salesCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  startDate: string = '';
  endDate: string = '';

  constructor(private masterService: MasterService) {}

  ngOnInit(): void {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);

    this.endDate = today.toISOString().split('T')[0];
    this.startDate = past.toISOString().split('T')[0];
  }

  ngAfterViewInit(): void {
    this.loadSalesTrend();
  }

  loadSalesTrend() {
    this.masterService.getSalesTrend(this.startDate, this.endDate).subscribe({
      next: (data: any) => {
        const labels = data.map((d: any) => d.period);
        const revenues = data.map((d: any) => d.revenue);
        this.renderChart(labels, revenues);
      },
      error: (err) => console.error('Failed to load sales trend', err)
    });
  }

  renderChart(labels: string[], revenues: number[]) {
    if (this.chart) {
      this.chart.destroy(); // avoid stacking multiple chart instances on re-fetch
    }

    this.chart = new Chart(this.salesCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue',
          data: revenues,
          borderColor: '#3CB549',
          backgroundColor: 'rgba(60, 181, 73, 0.1)',
          fill: true,
          tension: 0.3,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: { beginAtZero: true }
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