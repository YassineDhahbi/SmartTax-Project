import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  securityCode?: string;
  registrationLink?: string;
}

export interface EmailResponse {
  success: boolean;
  message: string;
  emailSent?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private readonly apiUrl = 'http://localhost:8080/api/email';
  
  // Configuration email fournie par l'utilisateur
  private readonly emailConfig = {
    email: 'smarttax209@gmail.com',
    appPassword: 'sppz atto xyhw gaon'
  };

  constructor(private http: HttpClient) { }

  /**
   * Envoyer un email de validation avec code de sécurité
   */
  sendValidationEmail(to: string, securityCode: string): Observable<EmailResponse> {
    const emailRequest: EmailRequest = {
      to: to,
      subject: 'SmartTax - Votre immatriculation a été validée',
      body: this.generateValidationEmailBody(securityCode),
      securityCode: securityCode,
      registrationLink: 'http://localhost:4200/register'
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<EmailResponse>(`${this.apiUrl}/send-validation`, emailRequest, { headers });
  }

  /**
   * Envoyer un email avec le TIN généré
   */
  sendTINEmail(to: string, subject: string, body: string, tin: string): Observable<EmailResponse> {
    const emailRequest: EmailRequest = {
      to: to,
      subject: subject,
      body: body,
      registrationLink: 'http://localhost:4200/register'
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    console.log('📧 Envoi email avec TIN:', tin);
    console.log('📧 EmailRequest:', emailRequest);

    return this.http.post<EmailResponse>(`${this.apiUrl}/send-tin-email`, emailRequest, { headers });
  }

  /**
   * Générer le corps de l'email de validation
   */
  private generateValidationEmailBody(securityCode: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: #007bff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 SmartTax</h1>
          <p style="color: #d4edda; margin: 10px 0 0 0; font-size: 16px;">Votre immatriculation a été validée !</p>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Félicitations !</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Votre dossier d'immatriculation fiscale a été <strong>validé avec succès</strong> par l'administration DGI.
          </p>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h3 style="color: #007bff; margin: 0 0 10px 0;">🔐 Code de sécurité</h3>
            <p style="color: #333; font-size: 18px; font-weight: bold; margin: 0; letter-spacing: 2px;">
              ${securityCode}
            </p>
          </div>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Pour créer votre compte et accéder à votre espace personnel, veuillez cliquer sur le bouton ci-dessous et utiliser le code de sécurité fourni.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:4200/register?code=${securityCode}" 
               style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
              🚀 Créer mon compte
            </a>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⚠️ Important :</strong> Conservez ce code de sécurité précieusement. Il vous sera demandé lors de la création de votre compte.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <div style="text-align: center; color: #999; font-size: 14px;">
            <p style="margin: 0;">Cet email a été envoyé automatiquement par SmartTax</p>
            <p style="margin: 5px 0 0 0;">Si vous n'avez pas fait cette demande, veuillez ignorer cet email.</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Générer un code de sécurité aléatoire
   */
  generateSecurityCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      if (i > 0 && i % 2 === 0) {
        code += '-';
      }
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  /**
   * Envoyer un email de rejet avec motif
   */
  sendRejectionEmail(to: string, motifRejet: string, dossierNumber: string): Observable<EmailResponse> {
    const emailRequest: EmailRequest = {
      to: to,
      subject: 'SmartTax - Votre immatriculation a été rejetée',
      body: this.generateRejectionEmailBody(motifRejet, dossierNumber),
      registrationLink: 'http://localhost:4200/register'
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    console.log('📧 Envoi email de rejet:', { to, motifRejet, dossierNumber });

    return this.http.post<EmailResponse>(`${this.apiUrl}/send-rejection`, emailRequest, { headers });
  }

  /**
   * Générer le corps de l'email de rejet
   */
  private generateRejectionEmailBody(motifRejet: string, dossierNumber: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: #dc3545; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📋 SmartTax</h1>
          <p style="color: #f8d7da; margin: 10px 0 0 0; font-size: 16px;">Votre immatriculation a été rejetée</p>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Information de rejet</h2>
          
         
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin: 0 0 10px 0;">📝 Raison de rejet</h3>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">
              ${motifRejet}
            </p>
          </div>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Votre dossier d'immatriculation fiscale a été <strong>rejeté</strong> par l'administration DGI pour les raisons mentionnées ci-dessus.
          </p>
          
          <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
            <p style="color: #0c5460; margin: 0; font-size: 14px;">
              <strong>📞 Contact :</strong> Si vous avez des questions concernant ce rejet, veuillez contacter le service client de SmartTax.
            </p>
          </div>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Vous pouvez soumettre une nouvelle demande d'immatriculation en corrigeant les points mentionnés dans le motif de rejet.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:4200/Immatriculation" 
               style="background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size:16px; font-weight: bold; display: inline-block;">
              📝 Nouvelle demande d'immatriculation
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <div style="text-align: center; color: #999; font-size: 14px;">
            <p style="margin: 0;">Cet email a été envoyé automatiquement par SmartTax</p>
            <p style="margin: 5px 0 0 0;">Si vous n'avez pas fait cette demande, veuillez ignorer cet email.</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Configurer le service email avec les identifiants fournis
   */
  configureEmailService(): void {
    // Cette méthode pourrait être utilisée pour configurer le service côté backend
    console.log('📧 Configuration du service email avec:', this.emailConfig.email);
  }
}
