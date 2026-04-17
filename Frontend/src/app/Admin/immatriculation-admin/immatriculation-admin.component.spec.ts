import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImmatriculationAdminComponent } from './immatriculation-admin.component';

describe('ImmatriculationAdminComponent', () => {
  let component: ImmatriculationAdminComponent;
  let fixture: ComponentFixture<ImmatriculationAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImmatriculationAdminComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImmatriculationAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
