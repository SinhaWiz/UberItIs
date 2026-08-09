package org.uber.userservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.uber.userservice.dto.*;
import org.uber.userservice.exception.DuplicateResourceException;
import org.uber.userservice.exception.ResourceNotFoundException;
import org.uber.userservice.model.Role;
import org.uber.userservice.model.User;
import org.uber.userservice.repository.UserRepository;
import org.uber.userservice.util.JwtUtil;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /**
     * Registers a new user after validating email/phone uniqueness and hashing the password.
     */
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already registered: " + request.getEmail());
        }
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new DuplicateResourceException("Phone already registered: " + request.getPhone());
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(request.getRole() != null ? request.getRole() : Role.RIDER)
                .build();

        User savedUser = userRepository.save(user);
        return toResponse(savedUser);
    }

    /**
     * Authenticates a user by email and password.
     * Generates a real JWT token using JwtUtil.
     */
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getRole());

        return LoginResponse.builder()
                .token(token)
                .user(toResponse(user))
                .build();
    }

    /**
     * Retrieves a single user by their MongoDB ID.
     */
    public UserResponse getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return toResponse(user);
    }

    /**
     * Updates a user's profile fields (name, phone, role).
     * Email and password changes are intentionally excluded for safety.
     */
    public UserResponse updateUser(String id, RegisterRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getPhone() != null) {
            if (userRepository.existsByPhoneAndIdNot(request.getPhone(), id)) {
                throw new DuplicateResourceException("Phone already registered: " + request.getPhone());
            }
            user.setPhone(request.getPhone());
        }
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }

        User updatedUser = userRepository.save(user);
        return toResponse(updatedUser);
    }

    /**
     * Returns all users. Intended for admin use.
     */
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Returns all users with a specific role (RIDER, DRIVER, or ADMIN).
     */
    public List<UserResponse> getUsersByRole(Role role) {
        return userRepository.findByRole(role).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Maps a User entity to a UserResponse DTO, stripping the password.
     */
    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
