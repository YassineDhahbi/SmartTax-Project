import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicationsFiscalesComponent } from './publications-fiscales.component';

describe('PublicationsFiscalesComponent', () => {
  let component: PublicationsFiscalesComponent;
  let fixture: ComponentFixture<PublicationsFiscalesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublicationsFiscalesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicationsFiscalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
