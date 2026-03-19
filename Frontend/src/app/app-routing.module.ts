import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { RegisterComponent } from './components/register/register.component';
import { ProfileComponent } from './components/profile/profile.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { AdminComponent } from './admin/admin/admin.component';
import { UtilisateurComponent } from './admin/utilisateur/utilisateur/utilisateur.component';
import { BlogComponent } from './components/blog/blog.component';
import { ParametreComponent } from './admin/parametre/parametre.component';
import { AboutComponent } from './components/about/about.component';
import { ActualiteComponent } from './components/actualite/actualite.component';
import { DocumentTelechargerComponent } from './components/document-telecharger/document-telecharger.component';
import { DocumentFiscalComponent } from './components/document-fiscal/document-fiscal.component';
import { ImmatriculationComponent } from './components/immatriculation/immatriculation.component';
import { ReclamationComponent } from './components/reclamation/reclamation.component';
import { DossierComponent } from './components/dossier/dossier.component';
import { DashboardAgentComponent } from './AgentDGI/dashboard-agent/dashboard-agent.component';

import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard], data: { roles: ['CONTRIBUABLE', 'AGENT', 'ADMIN'] } },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'admin', component: AdminComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } }, // Protégé par AuthGuard
  { path: 'utilisateur', component: UtilisateurComponent },
  { path: 'service', component: BlogComponent },
  { path: 'parametre', component: ParametreComponent },
  { path: 'about', component: AboutComponent },
  { path: 'actualite', component: ActualiteComponent },
  { path: 'Document Telecharger', component: DocumentTelechargerComponent },
  { path: 'Document Fiscale', component: DocumentFiscalComponent },
  { path: 'Immatriculation', component: ImmatriculationComponent },
  { path: 'Reclamation', component: ReclamationComponent },
  { path: 'Dossier', component: DossierComponent },
  { path: 'Dashboard-Agent', component: DashboardAgentComponent, canActivate: [AuthGuard], data: { roles: ['AGENT'] } },
  





  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    anchorScrolling: 'enabled',
    scrollPositionRestoration: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
