import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanDetailComponent } from './scan-detail.component';

describe('ScanDetailComponent', () => {
  let component: ScanDetailComponent;
  let fixture: ComponentFixture<ScanDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScanDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScanDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute validation percentage from validated fields', () => {
    component.fields = [
      { id: 1, is_validated: true } as any,
      { id: 2, is_validated: true } as any,
      { id: 3, is_validated: false } as any,
      { id: 4, is_validated: false } as any,
    ];

    expect(component.validationPercentage).toBe(50);
  });
});
