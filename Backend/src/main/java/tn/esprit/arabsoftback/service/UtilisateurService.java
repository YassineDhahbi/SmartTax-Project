package tn.esprit.arabsoftback.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.arabsoftback.entity.PasswordResetToken;
import tn.esprit.arabsoftback.entity.Utilisateur;
import tn.esprit.arabsoftback.repository.IUtilisateurRepository;
import tn.esprit.arabsoftback.repository.PasswordResetTokenRepository;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.util.List;
import java.util.Optional;

@Service
public class UtilisateurService implements IUtilisateurService {

    private static final Logger logger = LoggerFactory.getLogger(UtilisateurService.class);

    @Autowired
    private IUtilisateurRepository utilisateurRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private JavaMailSender mailSender;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Optional<Utilisateur> getUtilisateurById(Integer id) {
        return utilisateurRepository.findById(id);
    }

    @Override
    public Optional<Utilisateur> getUtilisateurByEmail(String email) {
        return utilisateurRepository.findByEmail(email);
    }

    @Override
    public Utilisateur updateUtilisateur(String email, Utilisateur utilisateurDetails) {
        Utilisateur utilisateur = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Mettre à jour uniquement les champs fournis, laisser les autres inchangés
        if (utilisateurDetails.getEmail() != null) {
            utilisateur.setEmail(utilisateurDetails.getEmail());
        }
        if (utilisateurDetails.getFirstName() != null) {
            utilisateur.setFirstName(utilisateurDetails.getFirstName());
        }
        if (utilisateurDetails.getLastName() != null) {
            utilisateur.setLastName(utilisateurDetails.getLastName());
        }
        if (utilisateurDetails.getPassword() != null) {
            utilisateur.setPassword(passwordEncoder.encode(utilisateurDetails.getPassword()));
        }
        if (utilisateurDetails.getPhoto() != null) {
            utilisateur.setPhoto(utilisateurDetails.getPhoto());
        }
        if (utilisateurDetails.getRole() != null) {
            utilisateur.setRole(utilisateurDetails.getRole());
        }
        if (utilisateurDetails.getStatus() != null) {
            utilisateur.setStatus(utilisateurDetails.getStatus());
        }
        if (utilisateurDetails.getDateNaissance() != null) {
            utilisateur.setDateNaissance(utilisateurDetails.getDateNaissance());
        }
        if (utilisateurDetails.getDateInscription() != null) {
            utilisateur.setDateInscription(utilisateurDetails.getDateInscription());
        }

        return utilisateurRepository.save(utilisateur);
    }

    @Override
    public void deleteUtilisateur(String email) {
        Utilisateur utilisateur = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        utilisateurRepository.delete(utilisateur);
    }

    @Override
    @Transactional
    public void deleteUtilisateurById(Integer id) {
        logger.info("Attempting to delete user with id: {}", id);
        Optional<Utilisateur> utilisateur = getUtilisateurById(id);
        if (utilisateur.isPresent()) {
            try {
                // Supprimer les tokens associés avant de supprimer l'utilisateur
                passwordResetTokenRepository.deleteByUtilisateurIdUtilisateur(id);
                entityManager.flush();
                utilisateurRepository.deleteById(id);
                logger.info("User with id {} deleted successfully", id);
            } catch (Exception e) {
                logger.error("Error deleting user with id {}: {}", id, e.getMessage());
                throw new RuntimeException("Erreur lors de la suppression de l'utilisateur: " + e.getMessage(), e);
            }
        } else {
            logger.warn("No user found with id: {}", id);
            throw new RuntimeException("Utilisateur non trouvé avec id : " + id);
        }
    }


    @Override
    @Transactional
    public void createPasswordResetTokenForUser(Utilisateur user, String token) {
        logger.info("Creating password reset token for user ID: {}", user.getIdUtilisateur());

        // Supprimer tout token existant pour cet utilisateur
        logger.debug("Attempting to delete existing token for user ID: {}", user.getIdUtilisateur());
        passwordResetTokenRepository.deleteByUtilisateurIdUtilisateur(user.getIdUtilisateur());
        entityManager.flush(); // Forcer la synchronisation avec la base de données
        logger.debug("Deletion of existing token completed for user ID: {}", user.getIdUtilisateur());

        // Vérifier si un token existe encore (pour débogage)
        Optional<PasswordResetToken> existingToken = passwordResetTokenRepository.findByUtilisateurIdUtilisateur(user.getIdUtilisateur());
        if (existingToken.isPresent()) {
            logger.warn("Token still exists for user ID: {} after deletion attempt", user.getIdUtilisateur());
        } else {
            logger.debug("No existing token found for user ID: {} after deletion", user.getIdUtilisateur());
        }

        // Créer et sauvegarder un nouveau token
        logger.debug("Creating new token for user ID: {}", user.getIdUtilisateur());
        PasswordResetToken resetToken = new PasswordResetToken(user);
        resetToken.setToken(token);
        passwordResetTokenRepository.save(resetToken);
        logger.info("New token created and saved for user ID: {}", user.getIdUtilisateur());
    }

    @Override
    public Optional<Utilisateur> validatePasswordResetToken(String token) {
        Optional<PasswordResetToken> resetToken = passwordResetTokenRepository.findByToken(token);
        if (resetToken.isPresent() && !resetToken.get().isExpired()) {
            return Optional.of(resetToken.get().getUtilisateur());
        }
        return Optional.empty();
    }

    @Override
    @Transactional
    public void changeUserPassword(Utilisateur user, String newPassword) {
        user.setPassword(passwordEncoder.encode(newPassword));
        utilisateurRepository.save(user);
        // Supprimer le token après changement de mot de passe
        passwordResetTokenRepository.deleteByUtilisateurIdUtilisateur(user.getIdUtilisateur());
    }

    @Override
    public void sendPasswordResetEmail(String email, String token) throws MessagingException {
        String resetUrl = "http://localhost:4200/reset-password?token=" + token;
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true);
        helper.setTo(email);
        helper.setSubject("Réinitialisation de votre mot de passe");
        helper.setText(
                "<h1>Réinitialisation de mot de passe</h1>" +
                        "<p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>" +
                        "<a href=\"" + resetUrl + "\">Réinitialiser le mot de passe</a>" +
                        "<p>Ce lien est valide pendant 24 heures.</p>" +
                        "<p>Si vous n'avez pas fait cette demande, ignorez cet e-mail.</p>",
                true
        );
        mailSender.send(mimeMessage);
    }

    @Override
    public List<Utilisateur> getAllUtilisateurs() {
        logger.info("Fetching all users");
        return utilisateurRepository.findAll();
    }
}