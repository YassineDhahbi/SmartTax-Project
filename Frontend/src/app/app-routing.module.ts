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

import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'admin', component: AdminComponent, canActivate: [AuthGuard] }, // Protégé par AuthGuard
  { path: 'utilisateur', component: UtilisateurComponent },
  { path: 'service', component: BlogComponent },
  { path: 'parametre', component: ParametreComponent },
  { path: 'about', component: AboutComponent },
  





  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
