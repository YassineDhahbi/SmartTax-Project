package tn.esprit.arabsoftback.controller;

import ai.djl.*;
import ai.djl.inference.*;
import ai.djl.modality.Classifications;
import ai.djl.modality.cv.*;
import ai.djl.modality.cv.transform.*;
import ai.djl.modality.cv.translator.*;
import ai.djl.repository.zoo.*;
import ai.djl.translate.*;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.util.Arrays;

@RestController
@RequestMapping("/api/cin-validator")
public class PredictionController {

    private static final Logger logger = LoggerFactory.getLogger(PredictionController.class);

    private final ResourceLoader resourceLoader;
    private ZooModel<Image, Classifications> model;

    public PredictionController(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @PostConstruct
    public void init() {
        try {
            Resource resourceDir = resourceLoader.getResource("classpath:models/");
            File[] modelFiles = resourceDir.getFile().listFiles((dir, name) -> name.startsWith("swin_cin_classifier") && name.endsWith(".pt"));
            if (modelFiles == null || modelFiles.length == 0) {
                logger.error("Aucun modèle trouvé dans : classpath:models/");
                throw new FileNotFoundException("Aucun modèle trouvé");
            }

            File latestModel = Arrays.stream(modelFiles)
                    .max((f1, f2) -> Long.compare(f1.lastModified(), f2.lastModified()))
                    .orElse(modelFiles[0]);
            Path tempModelPath = Files.createTempFile("model", ".pt");
            try (InputStream is = new FileInputStream(latestModel)) {
                Files.copy(is, tempModelPath, StandardCopyOption.REPLACE_EXISTING);
            }

            Translator<Image, Classifications> translator = ImageClassificationTranslator.builder()
                    .addTransform(new Resize(224))
                    .addTransform(new ToTensor())
                    .addTransform(new Normalize(
                            new float[]{0.485f, 0.456f, 0.406f},
                            new float[]{0.229f, 0.224f, 0.225f}))
                    .optApplySoftmax(true)
                    .optSynset(java.util.Arrays.asList("invalid", "valid"))
                    .build();

            Criteria<Image, Classifications> criteria = Criteria.builder()
                    .setTypes(Image.class, Classifications.class)
                    .optModelPath(tempModelPath)
                    .optTranslator(translator)
                    .optEngine("PyTorch")
                    .build();

            this.model = ModelZoo.loadModel(criteria);
            logger.info("Modèle chargé avec succès : {}", latestModel.getName());
        } catch (Exception e) {
            logger.error("Échec du chargement du modèle : {}", e.getMessage(), e);
            this.model = null;
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<PredictionResponse> verifyCin(@RequestParam("cin_image") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(new PredictionResponse("invalid", 0.0, false, false));
        }

        if (model == null) {
            return ResponseEntity.status(500).body(new PredictionResponse("error", 0.0, false, false));
        }

        try (InputStream is = file.getInputStream()) {
            Image image = ImageFactory.getInstance().fromInputStream(is);
            try (Predictor<Image, Classifications> predictor = model.newPredictor()) {
                Classifications prediction = predictor.predict(image);
                Classifications.Classification best = prediction.best();

                String originalClass = best.getClassName();
                double confidence = best.getProbability() * 100;
                boolean isValid = originalClass.equals("valid");
                boolean adjusted = false;

                if (confidence < 80.0) {
                    isValid = false;
                    originalClass = "invalid";
                    adjusted = true;
                }

                PredictionResponse response = new PredictionResponse(originalClass, confidence, isValid, adjusted);
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            logger.error("Erreur lors de la prédiction : {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(new PredictionResponse("error", 0.0, false, false));
        }
    }

    public static class PredictionResponse {
        private String status;
        private double confidence;
        private boolean valid;
        private boolean adjusted;

        public PredictionResponse(String status, double confidence, boolean valid, boolean adjusted) {
            this.status = status;
            this.confidence = confidence;
            this.valid = valid;
            this.adjusted = adjusted;
        }

        // Getters et setters
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public double getConfidence() { return confidence; }
        public void setConfidence(double confidence) { this.confidence = confidence; }
        public boolean isValid() { return valid; }
        public void setValid(boolean valid) { this.valid = valid; }
        public boolean isAdjusted() { return adjusted; }
        public void setAdjusted(boolean adjusted) { this.adjusted = adjusted; }
    }
}