package tn.esprit.arabsoftback.controller;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import tn.esprit.arabsoftback.entity.Role;
import tn.esprit.arabsoftback.entity.Utilisateur;
import tn.esprit.arabsoftback.repository.IUtilisateurRepository;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS}, allowCredentials = "true")
public class AuthController {
    @Autowired
    private IUtilisateurRepository utilisateurRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    private final String SECRET_KEY = "8d4f7b2a9e3c1d5f6a8b0c2e4f7a9b1d3e5f7a9b2c4e6f8a0b1c2d3e4f5a6b789abcdef";
    private final long EXPIRATION_TIME = 864_000_000; // 10 jours en millisecondes

    @Value("${recaptcha.secret.key}")
    private String recaptchaSecretKey;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Utilisateur utilisateur) {
        try {
            if (utilisateurRepository.findByEmail(utilisateur.getEmail()).isPresent()) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", "Email déjà utilisé");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            utilisateur.setPassword(passwordEncoder.encode(utilisateur.getPassword()));
            utilisateur.setRole(Role.CONTRIBUABLE);
            Utilisateur savedUser = utilisateurRepository.save(utilisateur);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Utilisateur créé avec succès");
            response.put("utilisateur", savedUser);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Erreur lors de l'inscription: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        try {
            String email = credentials.get("email");
            String password = credentials.get("password");
            // String recaptchaToken = credentials.get("recaptcha");
            //
            // System.out.println("Received credentials: email=" + email + ", password=" + password + ", recaptcha=" + recaptchaToken);
            //
            // if (!validateRecaptcha(recaptchaToken)) {
            //     Map<String, String> errorResponse = new HashMap<>();
            //     errorResponse.put("error", "Validation CAPTCHA échouée. Token: " + recaptchaToken + ", Response: " + getLastRecaptchaResponse());
            //     return ResponseEntity.status(403).body(errorResponse);
            // }

            Utilisateur utilisateur = utilisateurRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            if (!passwordEncoder.matches(password, utilisateur.getPassword())) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", "Mot de passe incorrect");
                return ResponseEntity.status(401).body(errorResponse);
            }

            String token = Jwts.builder()
                    .setSubject(email)
                    .claim("role", utilisateur.getRole().toString())
                    .setIssuedAt(new Date())
                    .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                    .signWith(Keys.hmacShaKeyFor(SECRET_KEY.getBytes()), Jwts.SIG.HS512)
                    .compact();

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Connexion réussie");
            response.put("idUtilisateur", utilisateur.getIdUtilisateur());
            response.put("role", utilisateur.getRole().toString());
            response.put("token", token);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Erreur lors de la connexion: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    private String lastRecaptchaResponse = "";
    private boolean validateRecaptcha(String recaptchaToken) {
        if (recaptchaToken == null || recaptchaToken.isEmpty()) {
            System.out.println("Recaptcha token is null or empty");
            return false;
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "https://www.google.com/recaptcha/api/siteverify";
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("secret", recaptchaSecretKey);
            requestBody.put("response", recaptchaToken);

            System.out.println("Validating reCAPTCHA with secret: " + recaptchaSecretKey);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestBody, Map.class);
            Map<String, Object> responseBody = response.getBody();
            lastRecaptchaResponse = responseBody != null ? responseBody.toString() : "No response";

            if (responseBody != null && responseBody.containsKey("success") && (Boolean) responseBody.get("success")) {
                return true;
            }
            System.out.println("reCAPTCHA validation failed: " + responseBody);
            return false;
        } catch (Exception e) {
            System.out.println("Recaptcha validation error: " + e.getMessage());
            lastRecaptchaResponse = "Error: " + e.getMessage();
            return false;
        }
    }

    private String getLastRecaptchaResponse() {
        return lastRecaptchaResponse;
    }
}