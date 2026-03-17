import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileAgentComponent } from './profile-agent.component';

describe('ProfileAgentComponent', () => {
  let component: ProfileAgentComponent;
  let fixture: ComponentFixture<ProfileAgentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProfileAgentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileAgentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
