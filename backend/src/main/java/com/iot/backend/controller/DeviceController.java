//thembattat3den

package com.iot.backend.controller;

import com.iot.backend.dto.ApiResponse;
import com.iot.backend.dto.DeviceControlRequest;
import com.iot.backend.dto.DeviceControlResponse;
import com.iot.backend.dto.DeviceResponse;
import com.iot.backend.entity.Action;
import com.iot.backend.entity.Device;
import com.iot.backend.entity.User;
import com.iot.backend.mqtt.MqttService;
import com.iot.backend.repository.ActionRepository;
import com.iot.backend.repository.DeviceRepository;
import com.iot.backend.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;


@RestController
@RequestMapping("/devices")
@CrossOrigin(origins = "*")
public class DeviceController {

    private final DeviceRepository deviceRepository;

    private final ActionRepository actionRepository;

    private final UserRepository userRepository;

    private final MqttService mqttService;


    public DeviceController(
            DeviceRepository deviceRepository,
            ActionRepository actionRepository,
            UserRepository userRepository,
            MqttService mqttService
    ) {
        this.deviceRepository = deviceRepository;
        this.actionRepository = actionRepository;
        this.userRepository = userRepository;
        this.mqttService = mqttService;
    }


    // =========================================================
    // API-09
    // GET /devices
    //
    // Lấy danh sách tất cả thiết bị
    // =========================================================

    @GetMapping
    public ApiResponse<List<DeviceResponse>> getAllDevices() {

        List<DeviceResponse> data = deviceRepository.findAll()
                .stream()
                .map(this::convertToResponse)
                .toList();

        return new ApiResponse<>(
                true,
                data,
                "Lấy danh sách thiết bị thành công"
        );
    }


    // =========================================================
    // API LỊCH SỬ BẬT/TẮT THIẾT BỊ
    //
    // GET /devices/history
    //
    // Hỗ trợ lọc theo deviceId, action, status
    // Có phân trang
    // =========================================================

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<Page<Map<String, Object>>>> getDeviceHistory(

            @RequestParam(required = false)
            Integer deviceId,

            @RequestParam(required = false)
            String action,

            @RequestParam(required = false)
            String status,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "10")
            int size

    ) {

        // Kiểm tra page
        if (page < 0) {
            page = 0;
        }

        // Không cho frontend yêu cầu quá nhiều dữ liệu
        if (size <= 0) {
            size = 10;
        }

        if (size > 100) {
            size = 100;
        }

        // Chuẩn hóa action
        if (action != null) {

            action = action.trim();

            if (action.isEmpty()) {
                action = null;
            } else {
                action = action.toLowerCase();
            }
        }

        // Chuẩn hóa status
        if (status != null) {

            status = status.trim();

            if (status.isEmpty()) {
                status = null;
            } else {
                status = status.toLowerCase();
            }
        }

        // Tạo Pageable, sắp xếp thời gian mới nhất lên đầu
        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(
                        Sort.Direction.DESC,
                        "createdAt"
                )
        );

        // Gọi repository
        Page<Action> actionPage =
                actionRepository.findHistory(
                        deviceId,
                        action,
                        status,
                        pageable
                );

        // Chuyển Action Entity thành dữ liệu trả frontend
        Page<Map<String, Object>> historyPage =
                actionPage.map(actionEntity -> {

                    Map<String, Object> item =
                            new LinkedHashMap<>();

                    // ID lịch sử
                    item.put(
                            "id",
                            actionEntity.getId()
                    );

                    // Thông tin thiết bị
                    if (actionEntity.getDevice() != null) {

                        item.put(
                                "deviceId",
                                actionEntity.getDevice().getIdDevice()
                        );

                        item.put(
                                "deviceName",
                                actionEntity.getDevice().getName()
                        );

                    } else {

                        item.put("deviceId", null);

                        item.put("deviceName", null);
                    }

                    // Hành động
                    item.put(
                            "action",
                            actionEntity.getAction()
                    );

                    // Trạng thái
                    item.put(
                            "status",
                            actionEntity.getStatus()
                    );

                    // Thời gian
                    item.put(
                            "createdAt",
                            actionEntity.getCreatedAt()
                    );

                    // Người thực hiện
                    if (actionEntity.getUser() != null) {

                        item.put(
                                "username",
                                actionEntity.getUser().getUsername()
                        );

                    } else {

                        item.put("username", null);
                    }

                    return item;
                });

        // Trả response
        return ResponseEntity.ok(
                new ApiResponse<>(
                        true,
                        historyPage,
                        "Lấy lịch sử điều khiển thành công"
                )
        );
    }


    // =========================================================
    // API-10
    // POST /devices/{id}/control
    //
    // Bật / tắt từng thiết bị
    // GIỮ NGUYÊN CHỨC NĂNG CŨ
    // =========================================================

    @PostMapping("/{id}/control")
    public ResponseEntity<ApiResponse<DeviceControlResponse>> controlDevice(

            @PathVariable Integer id,

            @RequestBody DeviceControlRequest request

    ) {

        System.out.println(
                ">>> CONTROL DEVICE CONTROLLER CALLED"
        );

        // 1. Kiểm tra device
        Device device =
                deviceRepository
                        .findById(id)
                        .orElse(null);

        if (device == null) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            new ApiResponse<>(
                                    false,
                                    null,
                                    "Không tìm thấy thiết bị"
                            )
                    );
        }

        // 2. Kiểm tra action
        if (
                request == null
                        ||
                request.getAction() == null
                        ||
                (
                        !request.getAction().equals("on")
                        &&
                        !request.getAction().equals("off")
                )
        ) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse<>(
                                    false,
                                    null,
                                    "Giá trị action phải là 'on' hoặc 'off'"
                            )
                    );
        }

        String actionValue = request.getAction();

        // 3. Lấy username từ JWT
        String username =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
                        .getName();

        // 4. Tìm user trong database
        User user =
                userRepository
                        .findByUsername(username)
                        .orElse(null);

        if (user == null) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            new ApiResponse<>(
                                    false,
                                    null,
                                    "Không tìm thấy người dùng"
                            )
                    );
        }

        // 5. Tạo Action
        // Ban đầu luôn là loading
        Action action = new Action();

        action.setUser(user);

        action.setDevice(device);

        action.setAction(actionValue);

        action.setStatus("loading");

        action.setCreatedAt(LocalDateTime.now());

        // 6. Lưu Action vào MySQL
        Action savedAction =
                actionRepository.save(action);

        // 7. Lấy MQTT key
        String mqttKey =
                getMqttKey(device.getIdDevice());

        // 8. Gửi lệnh MQTT
        mqttService.publishDeviceControl(
                mqttKey,
                actionValue
        );

        // 9. Format thời gian
        String createdAt =
                savedAction
                        .getCreatedAt()
                        .format(
                                DateTimeFormatter.ofPattern(
                                        "yyyy-MM-dd HH:mm:ss"
                                )
                        );

        // 10. Tạo response
        DeviceControlResponse response =
                new DeviceControlResponse(
                        savedAction.getId(),
                        device.getIdDevice(),
                        device.getName(),
                        actionValue,
                        "loading",
                        createdAt
                );

        // 11. Trả HTTP 202
        return ResponseEntity
                .status(HttpStatus.ACCEPTED)
                .body(
                        new ApiResponse<>(
                                true,
                                response,
                                "Lệnh điều khiển đã được gửi"
                        )
                );
    }


    // =========================================================
    // API MỚI: ĐIỀU KHIỂN ĐỒNG THỜI CẢ 3 ĐÈN
    //
    // POST /devices/control-all
    //
    // Request bật:
    // {"action":"on"}
    //
    // Request tắt:
    // {"action":"off"}
    //
    // ESP8266 nhận một lệnh MQTT:
    // {"all":"on"} hoặc {"all":"off"}
    //
    // Lưu 3 bản ghi Action tương ứng với 3 đèn.
    // =========================================================

    @PostMapping("/control-all")
    public ResponseEntity<ApiResponse<List<DeviceControlResponse>>> controlAllDevices(

            @RequestBody DeviceControlRequest request

    ) {

        // 1. Kiểm tra action
        if (
                request == null
                        ||
                request.getAction() == null
                        ||
                (
                        !request.getAction().equals("on")
                        &&
                        !request.getAction().equals("off")
                )
        ) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(
                            new ApiResponse<>(
                                    false,
                                    null,
                                    "Giá trị action phải là 'on' hoặc 'off'"
                            )
                    );
        }

        String actionValue = request.getAction();

        // 2. Lấy username từ JWT
        String username =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
                        .getName();

        // 3. Tìm user trong database
        User user =
                userRepository
                        .findByUsername(username)
                        .orElse(null);

        if (user == null) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            new ApiResponse<>(
                                    false,
                                    null,
                                    "Không tìm thấy người dùng"
                            )
                    );
        }

        // 4. Lấy thông tin cả 3 thiết bị từ database
        List<Device> devices = new ArrayList<>();

        for (int id = 1; id <= 3; id++) {

            Device device =
                    deviceRepository
                            .findById(id)
                            .orElse(null);

            // Nếu thiếu một thiết bị thì không gửi lệnh MQTT
            if (device == null) {

                return ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body(
                                new ApiResponse<>(
                                        false,
                                        null,
                                        "Không tìm thấy thiết bị có ID: " + id
                                )
                        );
            }

            devices.add(device);
        }

        // 5. Tạo lịch sử cho từng đèn
        // Mỗi đèn có một bản ghi Action riêng
        List<Action> savedActions = new ArrayList<>();

        for (Device device : devices) {

            Action action = new Action();

            action.setUser(user);

            action.setDevice(device);

            action.setAction(actionValue);

            // Chờ ESP8266 phản hồi
            action.setStatus("loading");

            action.setCreatedAt(LocalDateTime.now());

            // Lưu vào MySQL
            Action savedAction =
                    actionRepository.save(action);

            savedActions.add(savedAction);
        }

        // 6. Gửi MỘT lệnh MQTT để điều khiển cả 3 đèn
        //
        // mqttKey = "all"
        //
        // MqttService cần chuyển thành:
        // {"all":"on"} hoặc {"all":"off"}
        //
        // Không gửi 3 lệnh riêng biệt.
        mqttService.publishDeviceControl(
                "all",
                actionValue
        );

        // 7. Tạo danh sách kết quả trả về frontend
        List<DeviceControlResponse> responses =
                new ArrayList<>();

        for (int i = 0; i < devices.size(); i++) {

            Device device = devices.get(i);

            Action savedAction = savedActions.get(i);

            String createdAt =
                    savedAction
                            .getCreatedAt()
                            .format(
                                    DateTimeFormatter.ofPattern(
                                            "yyyy-MM-dd HH:mm:ss"
                                    )
                            );

            DeviceControlResponse response =
                    new DeviceControlResponse(
                            savedAction.getId(),
                            device.getIdDevice(),
                            device.getName(),
                            actionValue,
                            "loading",
                            createdAt
                    );

            responses.add(response);
        }

        // 8. Trả HTTP 202
        // Lệnh đã được tiếp nhận, đang chờ ESP8266 phản hồi.
        return ResponseEntity
                .status(HttpStatus.ACCEPTED)
                .body(
                        new ApiResponse<>(
                                true,
                                responses,
                                "Đã gửi lệnh điều khiển đồng thời 3 đèn"
                        )
                );
    }


    // =========================================================
    // Convert Device
    // GIỮ NGUYÊN CHỨC NĂNG CŨ
    // =========================================================

    private DeviceResponse convertToResponse(
            Device device
    ) {

        String mqttKey =
                getMqttKey(device.getIdDevice());

        Optional<Action> latestAction =
                actionRepository
                        .findTopByDevice_IdDeviceOrderByCreatedAtDesc(
                                device.getIdDevice()
                        );

        String currentStatus = "off";

        String lastActionAt = null;

        if (latestAction.isPresent()) {

            Action action = latestAction.get();

            // Chỉ lấy trạng thái thiết bị
            // khi action đã SUCCESS.
            if (
                    "success".equalsIgnoreCase(
                            action.getStatus()
                    )
            ) {

                currentStatus = action.getAction();
            }

            if (action.getCreatedAt() != null) {

                lastActionAt =
                        action.getCreatedAt()
                                .format(
                                        DateTimeFormatter.ofPattern(
                                                "yyyy-MM-dd HH:mm:ss"
                                        )
                                );
            }
        }

        return new DeviceResponse(
                device.getIdDevice(),
                device.getName(),
                mqttKey,
                currentStatus,
                lastActionAt
        );
    }


    // =========================================================
    // MQTT key
    // GIỮ NGUYÊN CHỨC NĂNG CŨ
    // =========================================================

    private String getMqttKey(
            Integer deviceId
    ) {

        switch (deviceId) {

            case 1:
                return "led1";

            case 2:
                return "led2";

            case 3:
                return "led3";

            default:
                return "";
        }
    }

}
