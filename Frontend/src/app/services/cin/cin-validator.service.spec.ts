import { TestBed } from '@angular/core/testing';

import { CinValidatorService } from './cin-validator.service';

describe('CinValidatorService', () => {
  let service: CinValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CinValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
