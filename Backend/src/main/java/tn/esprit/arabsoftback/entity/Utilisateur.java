package tn.esprit.arabsoftback.entity;

import jakarta.persistence.*;
import lombok.*;

import java.sql.Date;

@Entity
@Getter
@Setter
@ToString
@EqualsAndHashCode
public class Utilisateur {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @Setter(AccessLevel.NONE)
    Integer idUtilisateur;

    String firstName;

    String lastName;

    String email;

    String password;

    String photo;

    String cinImagePath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "VARCHAR(255) DEFAULT 'CONTRIBUABLE'")
    Role role;

    String status;

    @Column
    Date dateNaissance;

    @Column
    Date dateInscription;

    // Nouveaux champs pour la validation CIN
    private String cinValidationStatus; // 'valid', 'invalid', 'pending'
    private Double cinConfidence; // Pourcentage de confiance

    @PrePersist
    protected void onCreate() {
        this.dateInscription = new Date(System.currentTimeMillis());
        if (this.role == null) {
            this.role = Role.CONTRIBUABLE; // Valeur par défaut si non définie
        }
        if (this.cinValidationStatus == null) {
            this.cinValidationStatus = "pending";
        }
        if (this.cinConfidence == null) {
            this.cinConfidence = 0.0;
        }
    }
}