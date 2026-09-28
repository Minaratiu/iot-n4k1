package com.iot.backend.controller;

import com.iot.backend.dto.ApiResponse;
import com.iot.backend.entity.Action;
import com.iot.backend.repository.ActionRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/actions")
@CrossOrigin(origins = "*")
public class ActionController {

    private final ActionRepository actionRepository;

    public ActionController(ActionRepository actionRepository) {
        this.actionRepository = actionRepository;
    }

    // GET /actions
    // GET /actions?device_id=1
    // GET /actions?device_id=1&page=1&limit=5
    @GetMapping
    public ApiResponse<ActionPageResponse> getAllActions(
            @RequestParam(required = false) Integer device_id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit
    ) {

        if (page < 1) {
            page = 1;
        }

        if (limit < 1) {
            limit = 10;
        }

        if (limit > 100) {
            limit = 100;
        }

        Pageable pageable = PageRequest.of(
                page - 1,
                limit,
                Sort.by(
                        Sort.Direction.DESC,
                        "createdAt"
                )
        );

        Page<Action> actionPage;

        if (device_id != null) {

            actionPage = actionRepository.findByDevice_IdDevice(
                    device_id,
                    pageable
            );

        } else {

            actionPage = actionRepository.findAll(pageable);
        }

        List<ActionResponse> items = actionPage
                .getContent()
                .stream()
                .map(this::convertToResponse)
                .toList();

        ActionPageResponse data = new ActionPageResponse(
                items,
                actionPage.getTotalElements(),
                page,
                limit,
                actionPage.getTotalPages()
        );

        return new ApiResponse<>(
                true,
                data,
                "Lấy lịch sử điều khiển thành công"
        );
    }

    private ActionResponse convertToResponse(Action action) {

        String createdAt = null;

        if (action.getCreatedAt() != null) {
            createdAt = action.getCreatedAt()
                    .format(
                            DateTimeFormatter.ofPattern(
                                    "yyyy-MM-dd HH:mm:ss"
                            )
                    );
        }

        return new ActionResponse(
                action.getId(),
                action.getUser().getId(),
                action.getUser().getUsername(),
                action.getDevice().getIdDevice(),
                action.getDevice().getName(),
                action.getAction(),
                action.getStatus(),
                createdAt
        );
    }

    // =========================
    // Action Response
    // =========================

    public static class ActionResponse {

        private Integer id;
        private Integer userId;
        private String username;
        private Integer deviceId;
        private String deviceName;
        private String action;
        private String status;
        private String createdAt;

        public ActionResponse(
                Integer id,
                Integer userId,
                String username,
                Integer deviceId,
                String deviceName,
                String action,
                String status,
                String createdAt
        ) {
            this.id = id;
            this.userId = userId;
            this.username = username;
            this.deviceId = deviceId;
            this.deviceName = deviceName;
            this.action = action;
            this.status = status;
            this.createdAt = createdAt;
        }

        public Integer getId() {
            return id;
        }

        public Integer getUserId() {
            return userId;
        }

        public String getUsername() {
            return username;
}

        public Integer getDeviceId() {
            return deviceId;
        }

        public String getDeviceName() {
            return deviceName;
        }

        public String getAction() {
            return action;
        }

        public String getStatus() {
            return status;
        }

        public String getCreatedAt() {
            return createdAt;
        }
    }

    // =========================
    // Pagination Response
    // =========================

    public static class ActionPageResponse {

        private List<ActionResponse> items;
        private long total;
        private int page;
        private int limit;
        private int totalPages;

        public ActionPageResponse(
                List<ActionResponse> items,
                long total,
                int page,
                int limit,
                int totalPages
        ) {
            this.items = items;
            this.total = total;
            this.page = page;
            this.limit = limit;
            this.totalPages = totalPages;
        }

        public List<ActionResponse> getItems() {
            return items;
        }

        public long getTotal() {
            return total;
        }

        public int getPage() {
            return page;
        }

        public int getLimit() {
            return limit;
        }

        public int getTotalPages() {
            return totalPages;
        }
    }
}