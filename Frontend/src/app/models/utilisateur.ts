export class Utilisateur {
  idUtilisateur: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  photo: string | null;
  role: string;
  status: string | null;
  dateNaissance: string; // Format ISO (ex: "2023-01-01")
  dateInscription: string; // Format ISO
  cinImagePath: string | File | null; // Aligné avec Spring
  cinValidationStatus: 'valid' | 'invalid' | 'pending';
  cinConfidence: number;
  telephone: string | null;
  departement: string | null;
  adresse: string | null;

  constructor(data: Partial<Utilisateur> = {}) {
    this.idUtilisateur = data.idUtilisateur ?? 0;
    this.firstName = data.firstName ?? '';
    this.lastName = data.lastName ?? '';
    this.email = data.email ?? '';
    this.password = data.password ?? '';
    this.photo = data.photo ?? null;
    this.role = data.role ?? 'CONTRIBUABLE';
    this.status = data.status ?? null;
    this.dateNaissance = data.dateNaissance ?? '';
    this.dateInscription = data.dateInscription ?? '';
    this.cinImagePath = data.cinImagePath ?? null;
    this.cinValidationStatus = data.cinValidationStatus ?? 'pending';
    this.cinConfidence = data.cinConfidence ?? 0;
    this.telephone = data.telephone ?? null;
    this.departement = data.departement ?? null;
    this.adresse = data.adresse ?? null;
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
