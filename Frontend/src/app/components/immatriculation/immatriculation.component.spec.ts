import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImmatriculationComponent } from './immatriculation.component';

describe('ImmatriculationComponent', () => {
  let component: ImmatriculationComponent;
  let fixture: ComponentFixture<ImmatriculationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImmatriculationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImmatriculationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
