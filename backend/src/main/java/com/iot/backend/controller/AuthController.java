package com.iot.backend.controller;

import com.iot.backend.dto.ApiResponse;
import com.iot.backend.entity.User;
import com.iot.backend.repository.UserRepository;
import com.iot.backend.security.JwtService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    public AuthController(
            UserRepository userRepository,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @RequestBody LoginRequest request
    ) {

        if (request == null
                || request.getUsername() == null
                || request.getPassword() == null) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse<>(
                            false,
                            null,
                            "Username và password không được để trống"
                    ));
        }

        User user = userRepository
                .findByUsername(request.getUsername())
                .orElse(null);

        if (user == null) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>(
                            false,
                            null,
                            "Sai username hoặc password"
                    ));
        }

        if (!user.getPassword().equals(request.getPassword())) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>(
                            false,
                            null,
                            "Sai username hoặc password"
                    ));
        }

        String token = jwtService.generateToken(
                user.getId(),
                user.getUsername()
        );

        LoginResponse response = new LoginResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                token
        );

        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        response,
                        "Đăng nhập thành công"
                )
        );
    }

    public static class LoginRequest {

        private String username;
        private String password;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    public static class LoginResponse {

        private Integer userId;
        private String username;
        private String fullName;
        private String token;

        public LoginResponse(
                Integer userId,
                String username,
                String fullName,
                String token
        ) {
            this.userId = userId;
            this.username = username;
            this.fullName = fullName;
            this.token = token;
        }

        public Integer getUserId() {
            return userId;
        }

        public String getUsername() {
            return username;
        }

        public String getFullName() {
            return fullName;
        }

        public String getToken() {
            return token;
        }
    }
    @PostMapping("/logout")
public ResponseEntity<ApiResponse<Void>> logout() {
    // JWT stateless: không cần xoá gì phía server (trừ khi bạn triển khai blacklist token)
    return ResponseEntity.ok(
            new ApiResponse<>(true, null, "Đăng xuất thành công")
    );
}
}