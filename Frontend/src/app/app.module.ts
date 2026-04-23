import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { NgChartsModule } from 'ng2-charts';
import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { AboutComponent } from './components/about/about.component';
import { BlogComponent } from './components/blog/blog.component';
import { ContactComponent } from './components/contact/contact.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';
import { FeedbackComponent } from './components/feedback/feedback.component';
import { FooterComponent } from './components/footer/footer.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HeaderComponent } from './components/header/header.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ProfileComponent } from './components/profile/profile.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActualiteComponent } from './components/actualite/actualite.component';
import { DocumentTelechargerComponent } from './components/document-telecharger/document-telecharger.component';
import { DocumentFiscalComponent } from './components/document-fiscal/document-fiscal.component';
import { ImmatriculationComponent } from './components/immatriculation/immatriculation.component';
import { ReclamationComponent } from './components/reclamation/reclamation.component';
import { DossierComponent } from './components/dossier/dossier.component';
import { NotificationComponent } from './components/notification/notification.component';
import { ReclamationService } from './services/reclamation.service';
import { NotificationService } from './services/notification.service';
import { DashboardAgentComponent } from './AgentDGI/dashboard-agent/dashboard-agent.component';
import { ProfileAgentComponent } from './AgentDGI/profile-agent/profile-agent.component';
import { TrashViewComponent } from './AgentDGI/trash-view/trash-view.component';
import { AgentProfileComponent } from './AgentDGI/agent-profile/agent-profile.component';
import { DashboardAdminComponent } from './Admin/dashboard-admin/dashboard-admin.component';
import { UtilisateursAdminComponent } from './Admin/utilisateurs-admin/utilisateurs-admin.component';
import { ProfileAdminComponent } from './Admin/profile-admin/profile-admin.component';
import { TopbarComponent } from './Admin/topbar-admin/topbar.component';
import { ImmatriculationAdminComponent } from './Admin/immatriculation-admin/immatriculation-admin.component';
import { SideAdminComponent } from './Admin/side-admin/side-admin.component';
import { PublicationsFiscalesComponent } from './AgentDGI/publications-fiscales/publications-fiscales.component';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { DetailActualiteComponent } from './components/detail-actualite/detail-actualite.component';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    AboutComponent,
    BlogComponent,
    ContactComponent,
    PortfolioComponent,
    FeedbackComponent,
    FooterComponent,
    NavbarComponent,
    HeaderComponent,
    LoginComponent,
    RegisterComponent,
    ProfileComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    ActualiteComponent,
    DocumentTelechargerComponent,
    DocumentFiscalComponent,
    ImmatriculationComponent,
    ReclamationComponent,
    DossierComponent,
    NotificationComponent,
    DashboardAgentComponent,
    ProfileAgentComponent,
    TrashViewComponent,
    AgentProfileComponent,
    DashboardAdminComponent,
    UtilisateursAdminComponent,
    TopbarComponent,
    ImmatriculationAdminComponent,
    SideAdminComponent,
    PublicationsFiscalesComponent,
    DetailActualiteComponent
    


  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule, // Add this to imports
    HttpClientModule, // Add this to imports
    FormsModule, BrowserAnimationsModule,
    ProfileAdminComponent,
    NgChartsModule,
    CKEditorModule
  ],
  providers: [
    ReclamationService,
    NotificationService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
