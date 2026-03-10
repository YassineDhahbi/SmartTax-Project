package tn.esprit.arabsoftback.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.arabsoftback.entity.Utilisateur;

import java.util.Optional;

public interface IUtilisateurRepository extends JpaRepository<Utilisateur, Integer> {
    Optional<Utilisateur> findByEmail(String email);
}
