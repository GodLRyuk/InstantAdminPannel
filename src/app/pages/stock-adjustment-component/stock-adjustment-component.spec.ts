import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockAdjustmentComponent } from './stock-adjustment-component';

describe('StockAdjustmentComponent', () => {
  let component: StockAdjustmentComponent;
  let fixture: ComponentFixture<StockAdjustmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StockAdjustmentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StockAdjustmentComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
