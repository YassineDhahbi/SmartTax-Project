import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicationAdminComponent } from './publication-admin.component';

describe('PublicationAdminComponent', () => {
  let component: PublicationAdminComponent;
  let fixture: ComponentFixture<PublicationAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublicationAdminComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicationAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
