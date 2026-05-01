import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemandeInformationComponent } from './demande-information.component';

describe('DemandeInformationComponent', () => {
  let component: DemandeInformationComponent;
  let fixture: ComponentFixture<DemandeInformationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DemandeInformationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DemandeInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
