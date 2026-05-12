import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { DashboardAdminComponent } from './dashboard-admin.component';
import { ImmatriculationService } from '../../services/immatriculation.service';
import { PublicationService } from '../../services/publication.service';
import { UserService } from '../../services/user/user.service';

describe('DashboardAdminComponent', () => {
  let component: DashboardAdminComponent;
  let fixture: ComponentFixture<DashboardAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardAdminComponent],
      imports: [RouterTestingModule],
      providers: [
        { provide: HttpClient, useValue: { get: () => of({}) } },
        { provide: ImmatriculationService, useValue: { getAllImmatriculations: () => of([]) } },
        {
          provide: PublicationService,
          useValue: { getPublications: () => of({ data: [], pagination: {}, stats: null }) },
        },
        { provide: UserService, useValue: { getAllUtilisateurs: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
