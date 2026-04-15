import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';

import { UtilisateursAdminComponent } from './utilisateurs-admin.component';
import { UserService } from 'src/app/services/user/user.service';

describe('UtilisateursAdminComponent', () => {
  let component: UtilisateursAdminComponent;
  let fixture: ComponentFixture<UtilisateursAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UtilisateursAdminComponent],
      imports: [RouterTestingModule],
      providers: [
        {
          provide: UserService,
          useValue: {
            getAllUtilisateurs: () => of([])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UtilisateursAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
