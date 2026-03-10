package tn.esprit.arabsoftback.service;

import tn.esprit.arabsoftback.entity.Utilisateur;

import jakarta.mail.MessagingException;
import java.util.List;
import java.util.Optional;

public interface IUtilisateurService {
    Optional<Utilisateur> getUtilisateurById(Integer id);
    Optional<Utilisateur> getUtilisateurByEmail(String email);
    Utilisateur updateUtilisateur(String email, Utilisateur utilisateurDetails);
    void deleteUtilisateur(String email);
    void deleteUtilisateurById(Integer id); // Nouvelle méthode
    void createPasswordResetTokenForUser(Utilisateur user, String token);
    Optional<Utilisateur> validatePasswordResetToken(String token);
    void changeUserPassword(Utilisateur user, String newPassword);
    void sendPasswordResetEmail(String email, String token) throws MessagingException;
    List<Utilisateur> getAllUtilisateurs();
}