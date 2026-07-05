import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanUploadComponent } from './scan-upload.component';

describe('ScanUploadComponent', () => {
  let component: ScanUploadComponent;
  let fixture: ComponentFixture<ScanUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScanUploadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScanUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
