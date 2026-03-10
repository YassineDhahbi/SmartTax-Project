package tn.esprit.arabsoftback.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.esprit.arabsoftback.entity.Utilisateur;
import tn.esprit.arabsoftback.service.IUtilisateurService;

import jakarta.mail.MessagingException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:4200", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS}, allowCredentials = "true")
public class UtilisateurController {

    private static final Logger logger = LoggerFactory.getLogger(UtilisateurController.class);

    @Autowired
    private IUtilisateurService utilisateurService;

    private final String UPLOAD_DIR = "src/main/resources/static/assets/img/user/";

    @GetMapping("/me")
    public ResponseEntity<?> getUserDetails(Authentication authentication) {
        try {
            String email = authentication.getName();
            logger.info("Fetching details for user with email: {}", email);
            Optional<Utilisateur> utilisateur = utilisateurService.getUtilisateurByEmail(email);
            if (utilisateur.isPresent()) {
                return ResponseEntity.ok(utilisateur.get());
            } else {
                logger.warn("No user found with email: {}", email);
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", "Utilisateur non trouvé");
                return ResponseEntity.status(404).body(errorResponse);
            }
        } catch (Exception e) {
            logger.error("Error fetching user details: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Erreur lors de la récupération des détails: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PutMapping("/updateuser")
    public ResponseEntity<?> updateUserDetails(Authentication authentication, @RequestBody Utilisateur utilisateurDetails) {
        try {
            String email = authentication.getName();
            logger.info("Updating user with email: {}", email);
            Utilisateur updatedUtilisateur = utilisateurService.updateUtilisateur(email, utilisateurDetails);
            return ResponseEntity.ok(updatedUtilisateur);
        } catch (RuntimeException e) {
            logger.error("Error updating user: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Erreur lors de la mise à jour: " + e.getMessage());
            return ResponseEntity.status(404).body(errorResponse);
        }
    }

    @DeleteMapping("/deleteuser")
    public ResponseEntity<?> deleteUser(Authentication authentication) {
        try {
            String email = authentication.getName();
            logger.info("Deleting user with email: {}", email);
            utilisateurService.deleteUtilisateur(email);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            logger.error("Error deleting user: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Erreur lors de la suppression: " + e.getMessage());
            return ResponseEntity.status(404).body(errorResponse);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUserById(@PathVariable Integer id, Authentication authentication) {
        try {
            logger.info("Deleting user with id: {}", id);
            Optional<Utilisateur> utilisateur = utilisateurService.getUtilisateurById(id);
            if (utilisateur.isPresent()) {
                // Vérifier si l'utilisateur connecté est un admin ou le propriétaire
                String currentEmail = authentication.getName();
                if (!currentEmail.equals(utilisateur.get().getEmail()) && !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                    logger.warn("Unauthorized attempt to delete user with id: {}", id);
                    return ResponseEntity.status(403).body("Vous n'êtes pas autorisé à supprimer cet utilisateur.");
                }
                utilisateurService.deleteUtilisateurById(id); // Utiliser la nouvelle méthode
                return ResponseEntity.ok().build();
            } else {
                logger.warn("No user found with id: {}", id);
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", "Utilisateur non trouvé");
                return ResponseEntity.status(404).body(errorResponse);
            }
        } catch (Exception e) {
            logger.error("Error deleting user by id: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Erreur lors de la suppression: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/upload-photo")
    public ResponseEntity<Map<String, Object>> uploadPhoto(Authentication authentication, @RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        try {
            String email = authentication.getName();
            logger.info("Uploading photo for user with email: {}", email);
            Optional<Utilisateur> optionalUtilisateur = utilisateurService.getUtilisateurByEmail(email);
            if (!optionalUtilisateur.isPresent()) {
                logger.warn("No user found with email: {}", email);
                response.put("success", false);
                response.put("error", "Utilisateur non trouvé");
                return ResponseEntity.status(404).body(response);
            }

            Utilisateur utilisateur = optionalUtilisateur.get();

            if (!file.getContentType().startsWith("image/")) {
                logger.warn("Invalid file type for upload: {}", file.getContentType());
                response.put("success", false);
                response.put("error", "Seuls les fichiers image sont autorisés");
                return ResponseEntity.status(400).body(response);
            }

            if (utilisateur.getPhoto() != null && !utilisateur.getPhoto().isEmpty()) {
                String oldFileName = utilisateur.getPhoto().replace("http://localhost:8080/assets/img/user/", "");
                Path oldFilePath = Paths.get(UPLOAD_DIR + oldFileName);
                if (Files.exists(oldFilePath)) {
                    Files.delete(oldFilePath);
                    logger.info("Deleted old photo: {}", oldFilePath);
                }
            }

            String fileName = email.replaceAll("[^a-zA-Z0-9.@]", "_") + "_" + System.currentTimeMillis() + "_" +
                    file.getOriginalFilename().replaceAll("[\\s()]+", "_");
            Path uploadPath = Paths.get(UPLOAD_DIR + fileName);

            if (!Files.exists(Paths.get(UPLOAD_DIR))) {
                Files.createDirectories(Paths.get(UPLOAD_DIR));
                logger.info("Created upload directory: {}", UPLOAD_DIR);
            }

            Files.write(uploadPath, file.getBytes());
            logger.info("Uploaded photo to: {}", uploadPath);

            String photoUrl = "http://localhost:8080/assets/img/user/" + fileName;
            utilisateur.setPhoto(photoUrl);
            utilisateurService.updateUtilisateur(email, utilisateur);

            response.put("success", true);
            response.put("photoPath", photoUrl);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            logger.error("Error uploading photo: {}", e.getMessage());
            response.put("success", false);
            response.put("error", "Erreur lors du téléchargement de l'image: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> request) {
        Map<String, String> response = new HashMap<>();
        try {
            String email = request.get("email");
            logger.info("Received forgot password request for email: {}", email);
            Optional<Utilisateur> optionalUtilisateur = utilisateurService.getUtilisateurByEmail(email);
            if (!optionalUtilisateur.isPresent()) {
                logger.warn("No user found with email: {}", email);
                response.put("error", "Aucun utilisateur trouvé avec cet e-mail");
                return ResponseEntity.status(404).body(response);
            }

            Utilisateur utilisateur = optionalUtilisateur.get();
            String token = UUID.randomUUID().toString();
            utilisateurService.createPasswordResetTokenForUser(utilisateur, token);
            utilisateurService.sendPasswordResetEmail(email, token);
            logger.info("Password reset email sent to: {}", email);
            response.put("success", "Un lien de réinitialisation a été envoyé à votre e-mail");
            return ResponseEntity.ok(response);
        } catch (MessagingException e) {
            logger.error("Failed to send password reset email: {}", e.getMessage());
            response.put("error", "Erreur lors de l'envoi de l'e-mail: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> request) {
        Map<String, String> response = new HashMap<>();
        String token = request.get("token");
        String newPassword = request.get("newPassword");
        logger.info("Received reset password request with token: {}", token);

        if (newPassword == null || newPassword.length() < 6) {
            logger.warn("Invalid password: too short or null");
            response.put("error", "Le mot de passe doit contenir au moins 6 caractères");
            return ResponseEntity.status(400).body(response);
        }

        Optional<Utilisateur> optionalUtilisateur = utilisateurService.validatePasswordResetToken(token);
        if (!optionalUtilisateur.isPresent()) {
            logger.warn("Invalid or expired token: {}", token);
            response.put("error", "Token invalide ou expiré");
            return ResponseEntity.status(400).body(response);
        }

        Utilisateur utilisateur = optionalUtilisateur.get();
        utilisateurService.changeUserPassword(utilisateur, newPassword);
        logger.info("Password reset successful for user: {}", utilisateur.getEmail());
        response.put("success", "Mot de passe réinitialisé avec succès");
        response.put("redirectUrl", "http://localhost:4200/login");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/all")
    public ResponseEntity<List<Utilisateur>> getAllUtilisateurs() {
        logger.info("Fetching all users");
        List<Utilisateur> utilisateurs = utilisateurService.getAllUtilisateurs();
        return ResponseEntity.ok(utilisateurs);
    }
}