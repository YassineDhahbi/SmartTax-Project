package tn.esprit.arabsoftback.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import tn.esprit.arabsoftback.entity.PasswordResetToken;

import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByToken(String token);
    Optional<PasswordResetToken> findByUtilisateurIdUtilisateur(Integer idUtilisateur);

    @Modifying
    @Query("DELETE FROM PasswordResetToken prt WHERE prt.utilisateur.idUtilisateur = :idUtilisateur")
    void deleteByUtilisateurIdUtilisateur(Integer idUtilisateur);
}