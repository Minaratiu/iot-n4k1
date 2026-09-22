package com.iot.backend.controller;

import com.iot.backend.dto.ApiResponse;
import com.iot.backend.dto.DatasensorPageResponse;
import com.iot.backend.dto.DatasensorResponse;
import com.iot.backend.dto.PaginationResponse;
import com.iot.backend.entity.Datasensor;
import com.iot.backend.repository.DatasensorRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/datasensor")
@CrossOrigin(origins = "*")
public class DatasensorController {

    private final DatasensorRepository datasensorRepository;

    public DatasensorController(DatasensorRepository datasensorRepository) {
        this.datasensorRepository = datasensorRepository;
    }

    @GetMapping
    public ApiResponse<DatasensorPageResponse> getDataSensor(

            @RequestParam(name = "sensor_id", required = false)
            Integer sensorId,

            @RequestParam(required = false)
            String from,

            @RequestParam(required = false)
            String to,

            @RequestParam(name = "min_value", required = false)
            Double minValue,

            @RequestParam(name = "max_value", required = false)
            Double maxValue,

            @RequestParam(defaultValue = "1")
            int page,

            @RequestParam(defaultValue = "20")
            int limit,

            @RequestParam(defaultValue = "desc")
            String sort
    ) {

        // Kiểm tra page
        if (page < 1) {
            return new ApiResponse<>(
                    false,
                    null,
                    "Page phải lớn hơn hoặc bằng 1"
            );
        }

        // Kiểm tra limit
        if (limit < 1 || limit > 100) {
            return new ApiResponse<>(
                    false,
                    null,
                    "Limit phải từ 1 đến 100"
            );
        }

        // Kiểm tra sort
        if (!sort.equalsIgnoreCase("asc")
                && !sort.equalsIgnoreCase("desc")) {

            return new ApiResponse<>(
                    false,
                    null,
                    "Sort phải là asc hoặc desc"
            );
        }

        // Kiểm tra min/max
        if (minValue != null
                && maxValue != null
                && minValue > maxValue) {

            return new ApiResponse<>(
                    false,
                    null,
                    "min_value không được lớn hơn max_value"
            );
        }

        LocalDateTime fromDateTime;
        LocalDateTime toDateTime;

        try {

            fromDateTime = parseFrom(from);
            toDateTime = parseTo(to);

        } catch (Exception e) {

            return new ApiResponse<>(
                    false,
                    null,
                    "Định dạng from/to không hợp lệ"
            );
        }

        // Kiểm tra khoảng thời gian
        if (fromDateTime != null
                && toDateTime != null
                && fromDateTime.isAfter(toDateTime)) {

            return new ApiResponse<>(
                    false,
                    null,
                    "from không được lớn hơn to"
            );
        }

        Sort.Direction direction =
                sort.equalsIgnoreCase("asc")
                        ? Sort.Direction.ASC
                        : Sort.Direction.DESC;

        Pageable pageable = PageRequest.of(
                page - 1,
                limit,
                Sort.by(direction, "recordedAt")
        );

        Page<Datasensor> result;

        // ==============================
        // 4 ĐIỀU KIỆN
        // ==============================

        if (sensorId != null
                && fromDateTime != null
                && toDateTime != null
                && minValue != null
                && maxValue != null) {

            result = datasensorRepository
                    .findBySensor_IdSensorAndRecordedAtBetweenAndValueBetween(
                            sensorId,
                            fromDateTime,
                            toDateTime,
                            minValue,
                            maxValue,
                            pageable
                    );

        } else if (sensorId != null
                && fromDateTime != null
                && toDateTime != null) {

            result = datasensorRepository
                    .findBySensor_IdSensorAndRecordedAtBetween(
                            sensorId,
                            fromDateTime,
                            toDateTime,
                            pageable
                    );

        } else if (sensorId != null
                && minValue != null
                && maxValue != null) {

            result = datasensorRepository
                    .findBySensor_IdSensorAndValueBetween(
                            sensorId,
                            minValue,
                            maxValue,
                            pageable
                    );

        } else if (fromDateTime != null
                && toDateTime != null
                && minValue != null
                && maxValue != null) {

            result = datasensorRepository
                    .findByRecordedAtBetweenAndValueBetween(
                            fromDateTime,
                            toDateTime,
                            minValue,
                            maxValue,
                            pageable
                    );

        } else if (sensorId != null) {

            result = datasensorRepository
                    .findBySensor_IdSensor(
                            sensorId,
                            pageable
                    );

        } else if (fromDateTime != null
                && toDateTime != null) {

            result = datasensorRepository
                    .findByRecordedAtBetween(
                            fromDateTime,
                            toDateTime,
                            pageable
                    );

        } else if (minValue != null
                && maxValue != null) {

            result = datasensorRepository
                    .findByValueBetween(
                            minValue,
                            maxValue,
                            pageable
                    );

        } else {

            result = datasensorRepository.findAll(pageable);
        }

        // Convert dữ liệu
        List<DatasensorResponse> items = result
                .getContent()
                .stream()
                .map(this::convertToResponse)
                .toList();

        PaginationResponse pagination =
                new PaginationResponse(
                        result.getTotalElements(),
                        page,
                        limit,
                        result.getTotalPages()
                );

        DatasensorPageResponse data =
                new DatasensorPageResponse(
                        items,
                        pagination
                );

        return new ApiResponse<>(
                true,
                data,
                "Lấy dữ liệu cảm biến thành công"
        );
    }

    @GetMapping("/{id}")
public ApiResponse<DatasensorResponse> getDataSensorById(
        @PathVariable Integer id) {

    Datasensor datasensor =
            datasensorRepository.findById(id).orElse(null);

    if (datasensor == null) {
        return new ApiResponse<>(
                false,
                null,
                "Không tìm thấy dữ liệu cảm biến"
        );
    }

    return new ApiResponse<>(
            true,
            convertToResponse(datasensor),
            "Lấy chi tiết dữ liệu cảm biến thành công"
    );
}

    private DatasensorResponse convertToResponse(
            Datasensor datasensor) {

        Integer sensorId =
                datasensor.getSensor().getIdSensor();

        String sensorName =
                datasensor.getSensor().getName();

        String unit;

        switch (sensorId) {

            case 1:
                unit = "°C";
                break;

            case 2:
                unit = "%";
                break;

            case 3:
                unit = "lux";
                break;

            default:
                unit = "";
        }

        String recordedAt =
                datasensor.getRecordedAt()
                        .format(
                                DateTimeFormatter.ofPattern(
                                        "yyyy/MM/dd HH:mm:ss"
                                )
                        );

        return new DatasensorResponse(
                datasensor.getId(),
                sensorId,
                sensorName,
                unit,
                datasensor.getValue(),
                recordedAt
        );
    }

    private LocalDateTime parseFrom(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        if (value.length() == 10) {

            LocalDate date =
                    LocalDate.parse(value);

            return date.atStartOfDay();
        }

        return LocalDateTime.parse(
                value,
                DateTimeFormatter.ofPattern(
                        "yyyy-MM-dd HH:mm:ss"
                )
        );
    }

    private LocalDateTime parseTo(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        if (value.length() == 10) {

            LocalDate date =
                    LocalDate.parse(value);

            return date.atTime(
                    LocalTime.MAX
            );
        }

        return LocalDateTime.parse(
                value,
                DateTimeFormatter.ofPattern(
                        "yyyy-MM-dd HH:mm:ss"
                )
        );
    }
}