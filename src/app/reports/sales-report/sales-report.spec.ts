import { EMPTY } from 'rxjs';
import { MasterService } from '../../services/auth.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesReport } from './sales-report';

describe('SalesReport', () => {
  let component: SalesReport;
  let fixture: ComponentFixture<SalesReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesReport],
      providers: [{ provide: MasterService, useValue: { getSalesTrend: () => EMPTY } }],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesReport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
