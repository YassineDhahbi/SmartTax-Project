import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentTelechargerComponent } from './document-telecharger.component';

describe('DocumentTelechargerComponent', () => {
  let component: DocumentTelechargerComponent;
  let fixture: ComponentFixture<DocumentTelechargerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DocumentTelechargerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentTelechargerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
