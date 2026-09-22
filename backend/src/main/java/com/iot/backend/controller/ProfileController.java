package com.iot.backend.controller;

import com.iot.backend.dto.ApiResponse;
import com.iot.backend.entity.User;
import com.iot.backend.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/profile")
@CrossOrigin(origins = "*")
public class ProfileController {

    private final UserRepository userRepository;

    public ProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // API-14: Lấy thông tin cá nhân của user đang đăng nhập (dựa vào JWT)
    @GetMapping
    public ResponseEntity<ApiResponse<ProfileResponse>> getProfile() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>(false, null, "Chưa đăng nhập hoặc token không hợp lệ"));
        }

        String username = authentication.getName();

        User user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse<>(false, null, "Không tìm thấy người dùng"));
        }

        ProfileResponse response = new ProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getStudentId(),
                user.getClassName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getGithubUrl(),
                user.getFigmaUrl(),
                user.getPostmanUrl(),
                user.getReportUrl()
        );

        return ResponseEntity.ok(
                new ApiResponse<>(true, response, "Lấy thông tin cá nhân thành công")
        );
    }

    @PutMapping
public ResponseEntity<ApiResponse<ProfileResponse>> updateProfile(@RequestBody ProfileResponse request) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String username = authentication.getName();

    User user = userRepository.findByUsername(username).orElse(null);
    if (user == null) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiResponse<>(false, null, "Không tìm thấy người dùng"));
    }

    user.setFullName(request.getFullName());
    user.setStudentId(request.getStudentId());
    user.setClassName(request.getClassName());
    user.setEmail(request.getEmail());
    user.setGithubUrl(request.getGithubUrl());
    user.setFigmaUrl(request.getFigmaUrl());
    user.setPostmanUrl(request.getPostmanUrl());
    user.setReportUrl(request.getReportUrl());

    userRepository.save(user);

    return ResponseEntity.ok(new ApiResponse<>(true, request, "Cập nhật thông tin thành công"));
}

    // DTO trả về cho FE — không bao gồm password
    public static class ProfileResponse {

        private Integer id;
        private String username;
        private String fullName;
        private String studentId;
        private String className;
        private String email;
        private String avatarUrl;
        private String githubUrl;
        private String figmaUrl;
        private String postmanUrl;
        private String reportUrl;

        public ProfileResponse(
                Integer id,
                String username,
                String fullName,
                String studentId,
                String className,
                String email,
                String avatarUrl,
                String githubUrl,
                String figmaUrl,
                String postmanUrl,
                String reportUrl
        ) {
            this.id = id;
            this.username = username;
            this.fullName = fullName;
            this.studentId = studentId;
            this.className = className;
            this.email = email;
            this.avatarUrl = avatarUrl;
            this.githubUrl = githubUrl;
            this.figmaUrl = figmaUrl;
            this.postmanUrl = postmanUrl;
            this.reportUrl = reportUrl;
        }

        public Integer getId() { return id; }
        public String getUsername() { return username; }
        public String getFullName() { return fullName; }
        public String getStudentId() { return studentId; }
        public String getClassName() { return className; }
        public String getEmail() { return email; }
        public String getAvatarUrl() { return avatarUrl; }
        public String getGithubUrl() { return githubUrl; }
        public String getFigmaUrl() { return figmaUrl; }
        public String getPostmanUrl() { return postmanUrl; }
        public String getReportUrl() { return reportUrl; }
    }
}