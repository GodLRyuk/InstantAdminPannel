import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Advbanner } from './advbanner';

describe('Advbanner', () => {
  let component: Advbanner;
  let fixture: ComponentFixture<Advbanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Advbanner],
    }).compileComponents();

    fixture = TestBed.createComponent(Advbanner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
