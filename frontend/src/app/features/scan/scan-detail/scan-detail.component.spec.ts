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
});
