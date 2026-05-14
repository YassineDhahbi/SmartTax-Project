import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { DocumentTelechargerComponent } from './document-telecharger.component';
import { DownloadDocumentCatalogService } from '../../services/download-document-catalog.service';

describe('DocumentTelechargerComponent', () => {
  let component: DocumentTelechargerComponent;
  let fixture: ComponentFixture<DocumentTelechargerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, HttpClientTestingModule],
      declarations: [DocumentTelechargerComponent],
      providers: [
        {
          provide: DownloadDocumentCatalogService,
          useValue: {
            fetchPublicList: () => of([]),
            formatSize: () => '-',
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentTelechargerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
