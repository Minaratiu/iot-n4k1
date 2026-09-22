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
    // Có thể sử dụng:
    //
    // GET /devices/history
    //
    // GET /devices/history?deviceId=1
    //
    // GET /devices/history?action=on
    //
    // GET /devices/history?status=loading
    //
    // GET /devices/history?deviceId=1&action=on&status=loading
    //
    // Có phân trang:
    //
    // GET /devices/history?page=0&size=10
    //
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

        // =====================================================
        // Kiểm tra page
        // =====================================================

        if (page < 0) {
            page = 0;
        }


        // =====================================================
        // Kiểm tra size
        //
        // Không cho frontend yêu cầu quá nhiều dữ liệu
        // =====================================================

        if (size <= 0) {
            size = 10;
        }

        if (size > 100) {
            size = 100;
        }


        // =====================================================
        // Chuẩn hóa action
        //
        // Frontend có thể gửi:
        // ON
        // on
        // On
        //
        // Sau khi chuẩn hóa:
        // on
        // =====================================================

        if (action != null) {

            action = action.trim();

            if (action.isEmpty()) {
                action = null;
            } else {
                action = action.toLowerCase();
            }
        }


        // =====================================================
        // Chuẩn hóa status
        //
        // Ví dụ:
        // LOADING
        // loading
        // Loading
        //
        // đều được đưa về:
        // loading
        // =====================================================

        if (status != null) {

            status = status.trim();

            if (status.isEmpty()) {
                status = null;
            } else {
                status = status.toLowerCase();
            }
        }


        // =====================================================
        // Tạo Pageable
        //
        // Sắp xếp thời gian mới nhất lên đầu
        // =====================================================

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(
                        Sort.Direction.DESC,
                        "createdAt"
                )
        );


        // =====================================================
        // Gọi repository
        // =====================================================

        Page<Action> actionPage =
                actionRepository.findHistory(
                        deviceId,
                        action,
                        status,
                        pageable
                );


        // =====================================================
        // Chuyển Action Entity thành dữ liệu trả frontend
        //
        // Không trả trực tiếp User/Device Entity
        // để tránh JSON lồng nhau hoặc vòng lặp.
        // =====================================================

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
                                actionEntity
                                        .getDevice()
                                        .getIdDevice()
                        );

                        item.put(
                                "deviceName",
                                actionEntity
                                        .getDevice()
                                        .getName()
                        );

                    } else {

                        item.put(
                                "deviceId",
                                null
                        );

                        item.put(
                                "deviceName",
                                null
                        );
                    }


                    // Hành động
                    item.put(
                            "action",
                            actionEntity.getAction()
                    );


                    // Trạng thái
                    //
                    // loading:
                    // ESP chưa trả response
                    //
                    // success:
                    // ESP đã phản hồi thành công
                    //
                    // failed:
                    // ESP trả response thất bại
                    item.put(
                            "status",
                            actionEntity.getStatus()
                    );


                    // Thời gian
                    item.put(
                            "createdAt",
                            actionEntity.getCreatedAt()
                    );


                    return item;
                });


        // =====================================================
        // Trả response
        // =====================================================

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
    // Bật / tắt thiết bị
    // =========================================================
    @PostMapping("/{id}/control")
    public ResponseEntity<ApiResponse<DeviceControlResponse>> controlDevice(

            @PathVariable Integer id,

            @RequestBody DeviceControlRequest request

    ) {

        System.out.println(
                ">>> CONTROL DEVICE CONTROLLER CALLED"
        );


        // =====================================================
        // 1. Kiểm tra device
        // =====================================================

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


        // =====================================================
        // 2. Kiểm tra action
        //
        // Chỉ cho phép:
        // on
        // off
        // =====================================================

        if (
                request == null
                        ||
                request.getAction() == null
                        ||
                (
                        !request
                                .getAction()
                                .equals("on")
                        &&
                        !request
                                .getAction()
                                .equals("off")
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


        String actionValue =
                request.getAction();


        // =====================================================
        // 3. Lấy username từ JWT
        // =====================================================

        String username =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
                        .getName();


        // =====================================================
        // 4. Tìm user trong database
        // =====================================================

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


        // =====================================================
        // 5. Tạo Action
        //
        // Ban đầu luôn là loading.
        //
        // Nếu ESP phản hồi SUCCESS:
        // loading -> success
        //
        // Nếu ESP phản hồi thất bại:
        // loading -> failed
        //
        // Nếu ESP không phản hồi:
        // vẫn loading
        // =====================================================

        Action action = new Action();

        action.setUser(user);

        action.setDevice(device);

        action.setAction(actionValue);

        action.setStatus("loading");

        action.setCreatedAt(
                LocalDateTime.now()
        );


        // =====================================================
        // 6. Lưu Action vào MySQL
        // =====================================================

        Action savedAction =
                actionRepository.save(action);


        // =====================================================
        // 7. Lấy MQTT key
        // =====================================================

        String mqttKey =
                getMqttKey(
                        device.getIdDevice()
                );


        // =====================================================
        // 8. Gửi lệnh MQTT
        // =====================================================

        mqttService.publishDeviceControl(
                mqttKey,
                actionValue
        );


        // =====================================================
        // 9. Format thời gian
        // =====================================================

        String createdAt =
                savedAction
                        .getCreatedAt()
                        .format(
                                DateTimeFormatter.ofPattern(
                                        "yyyy-MM-dd HH:mm:ss"
                                )
                        );


        // =====================================================
        // 10. Tạo response
        // =====================================================

        DeviceControlResponse response =
                new DeviceControlResponse(
                        savedAction.getId(),
                        device.getIdDevice(),
                        device.getName(),
                        actionValue,
                        "loading",
                        createdAt
                );


        // =====================================================
        // 11. Trả HTTP 202
        //
        // 202 = lệnh đã được tiếp nhận,
        // nhưng chưa chắc ESP đã thực hiện xong.
        // =====================================================

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
    // Convert Device
    // =========================================================
    private DeviceResponse convertToResponse(
            Device device
    ) {

        String mqttKey =
                getMqttKey(
                        device.getIdDevice()
                );


        Optional<Action> latestAction =
                actionRepository
                        .findTopByDevice_IdDeviceOrderByCreatedAtDesc(
                                device.getIdDevice()
                        );


        String currentStatus = "off";

        String lastActionAt = null;


        if (latestAction.isPresent()) {

            Action action =
                    latestAction.get();


            // Chỉ lấy trạng thái thiết bị
            // khi action đã SUCCESS.
            //
            // Nếu đang loading thì không thay đổi
            // currentStatus.
            if (
                    "success"
                            .equalsIgnoreCase(
                                    action.getStatus()
                            )
            ) {

                currentStatus =
                        action.getAction();
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
