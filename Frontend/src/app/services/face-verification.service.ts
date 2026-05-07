import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FaceVerificationResponse {
  verified: boolean;
  similarity: number;
  confidence: number;
  message: string;
  details: {
    distance?: number;
    multiFaceDetected?: boolean;
    detectedFacesDocument?: number;
    detectedFacesWebcam?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class FaceVerificationService {
  private readonly apiUrl = 'http://localhost:8080/api/face-verification';

  constructor(private http: HttpClient) {}

  verifyFace(webcamPhoto: File, identityDocument: File): Observable<FaceVerificationResponse> {
    const formData = new FormData();
    formData.append('webcamPhoto', webcamPhoto);
    formData.append('identityDocument', identityDocument);
    return this.http.post<FaceVerificationResponse>(this.apiUrl, formData);
  }
}
