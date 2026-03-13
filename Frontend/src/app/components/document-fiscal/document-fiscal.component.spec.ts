import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentFiscalComponent } from './document-fiscal.component';

describe('DocumentFiscalComponent', () => {
  let component: DocumentFiscalComponent;
  let fixture: ComponentFixture<DocumentFiscalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DocumentFiscalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentFiscalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
