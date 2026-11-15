import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MasterService } from '../../services/auth.service';

import { Stock } from './stock';

describe('Stock', () => {
  let component: Stock;
  let fixture: ComponentFixture<Stock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Stock],
      providers: [{
        provide: MasterService,
        useValue: {
          getAllstock: () => of([]),
          getAllProducts: () => of([]),
        },
      }],
    }).compileComponents();

    fixture = TestBed.createComponent(Stock);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
