package tn.esprit.arabsoftback.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/training")
public class TrainingController {
    private static final Logger logger = LoggerFactory.getLogger(TrainingController.class);

    @Value("${training.data.path}")
    private String trainingDataPath;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadImages(
            @RequestParam("images") MultipartFile[] files,
            @RequestParam("category") String category) throws IOException {

        Path categoryPath = Paths.get(trainingDataPath, "normalized_data", "train", category);
        Files.createDirectories(categoryPath);

        for (MultipartFile file : files) {
            String fileName = Objects.requireNonNull(file.getOriginalFilename());
            Path destination = categoryPath.resolve(fileName);
            file.transferTo(destination);
            logger.info("Saved file: {}", destination);
        }

        return ResponseEntity.ok().build();
    }

    @GetMapping("/images")
    public ResponseEntity<List<ImageInfo>> getTrainingImages() throws IOException {
        List<ImageInfo> images = new ArrayList<>();

        Path validPath = Paths.get(trainingDataPath, "normalized_data", "train", "valid");
        if (Files.exists(validPath)) {
            images.addAll(Files.list(validPath)
                    .map(path -> new ImageInfo(path.getFileName().toString(), "valid"))
                    .collect(Collectors.toList()));
        }

        Path invalidPath = Paths.get(trainingDataPath, "normalized_data", "train", "invalid");
        if (Files.exists(invalidPath)) {
            images.addAll(Files.list(invalidPath)
                    .map(path -> new ImageInfo(path.getFileName().toString(), "invalid"))
                    .collect(Collectors.toList()));
        }

        return ResponseEntity.ok(images);
    }

    @DeleteMapping("/images/{category}/{imageName}")
    public ResponseEntity<?> deleteImage(
            @PathVariable String category,
            @PathVariable String imageName) throws IOException {

        Path imagePath = Paths.get(trainingDataPath, "normalized_data", "train", category, imageName);
        Files.deleteIfExists(imagePath);
        logger.info("Deleted file: {}", imagePath);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/train")
    public ResponseEntity<String> trainModel() {
        try {
            Path pythonScript = Paths.get(trainingDataPath, "train_model.py");
            Path logFile = Paths.get(trainingDataPath, "training.log");

            ProcessBuilder pb = new ProcessBuilder("python", pythonScript.toString());
            pb.directory(new File(trainingDataPath));
            pb.redirectErrorStream(true);
            pb.redirectOutput(ProcessBuilder.Redirect.appendTo(logFile.toFile()));

            Process process = pb.start();
            logger.info("Started training process with PID: {}", process.pid());

            // Attendre avec timeout
            boolean finished = process.waitFor(30, TimeUnit.MINUTES);

            if (!finished) {
                process.destroyForcibly();
                logger.warn("Training process timed out");
                return ResponseEntity.status(HttpStatus.REQUEST_TIMEOUT)
                        .body("Training timeout");
            }

            int exitCode = process.exitValue();
            if (exitCode == 0) {
                logger.info("Training completed successfully");
                return ResponseEntity.ok("Training completed successfully. Model updated in Spring Boot.");
            } else {
                logger.error("Training failed with exit code: {}", exitCode);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Training failed with exit code: " + exitCode);
            }
        } catch (Exception e) {
            logger.error("Error during training", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    public static class ImageInfo {
        private String name;
        private String category;

        public ImageInfo(String name, String category) {
            this.name = name;
            this.category = category;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
    }
}