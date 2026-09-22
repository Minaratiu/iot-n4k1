package com.iot.backend.controller;

import com.iot.backend.dto.ApiResponse;
import com.iot.backend.dto.LatestSensorResponse;
import com.iot.backend.dto.ChartPoint;
import com.iot.backend.dto.SensorChartResponse;
import com.iot.backend.entity.Datasensor;
import com.iot.backend.repository.DatasensorRepository;


import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import java.time.format.DateTimeFormatter;
import java.util.List;



@RestController
@RequestMapping("/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DatasensorRepository datasensorRepository;

    public DashboardController(
            DatasensorRepository datasensorRepository) {

        this.datasensorRepository = datasensorRepository;
    }

    @GetMapping("/sensors/latest")
    public ApiResponse<List<LatestSensorResponse>> getLatestSensors() {

        List<Datasensor> latestData =
                datasensorRepository.findLatestSensorData();

        if (latestData.isEmpty()) {
            return new ApiResponse<>(
                    false,
                    null,
                    "Không có dữ liệu cảm biến"
            );
        }

        List<LatestSensorResponse> data =
                latestData.stream()
                        .map(this::convertToResponse)
                        .toList();

        return new ApiResponse<>(
                true,
                data,
                "Lấy dữ liệu cảm biến mới nhất thành công"
        );
    }

        @GetMapping("/sensors/chart")
    public ApiResponse<List<SensorChartResponse>> getSensorChart(

            @RequestParam(required = false)
            Integer sensor_id,

            @RequestParam(required = false)
            String from,

            @RequestParam(required = false)
            String to,

            @RequestParam(defaultValue = "50")
            int limit
    ) {

       

        if (limit < 1 || limit > 200) {
            return new ApiResponse<>(
                    false,
                    null,
                    "Limit phải từ 1 đến 200"
            );
        }

        LocalDateTime fromDateTime;
        LocalDateTime toDateTime;

        try {
            fromDateTime = parseFromChart(from);
            toDateTime = parseToChart(to);

        } catch (Exception e) {
            return new ApiResponse<>(
                    false,
                    null,
                    "Định dạng from/to không hợp lệ"
            );
        }

        if (fromDateTime == null) {
            fromDateTime = LocalDateTime.of(
                    2000, 1, 1, 0, 0, 0
            );
        }

        if (toDateTime == null) {
            toDateTime = LocalDateTime.now();
        }

        if (fromDateTime.isAfter(toDateTime)) {
            return new ApiResponse<>(
                    false,
                    null,
                    "from không được lớn hơn to"
            );
        }

       
        List<Integer> sensorIds;

if (sensor_id != null) {
    sensorIds = List.of(sensor_id);
} else {
    sensorIds = List.of(1, 2, 3);
}

List<SensorChartResponse> result = new java.util.ArrayList<>();

DateTimeFormatter formatter =
        DateTimeFormatter.ofPattern(
                "yyyy-MM-dd HH:mm:ss"
        );

for (Integer currentSensorId : sensorIds) {

    List<Datasensor> sensorData =
            datasensorRepository.findChartData(
                    currentSensorId,
                    fromDateTime,
                    toDateTime
            );

    if (sensorData.isEmpty()) {
        continue;
    }

    if (sensorData.size() > limit) {
    sensorData = sensorData.subList(0, limit);
}

sensorData = new java.util.ArrayList<>(sensorData);
java.util.Collections.reverse(sensorData);

    Datasensor first = sensorData.get(0);

    Integer sensorId =
            first.getSensor().getIdSensor();

    String sensorName =
            first.getSensor().getName();

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

    List<ChartPoint> points =
            sensorData.stream()
                    .map(d -> new ChartPoint(
                            d.getValue(),
                            d.getRecordedAt()
                                    .format(formatter)
                    ))
                    .toList();

    result.add(
            new SensorChartResponse(
                    sensorId,
                    sensorName,
                    unit,
                    points
            )
    );
}

if (result.isEmpty()) {
    return new ApiResponse<>(
            false,
            null,
            "Không có dữ liệu biểu đồ"
    );
}

return new ApiResponse<>(
        true,
        result,
        "Lấy dữ liệu biểu đồ thành công"
);        
    }
    

    private LatestSensorResponse convertToResponse(
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
                                        "yyyy-MM-dd HH:mm:ss"
                                )
                        );

        return new LatestSensorResponse(
                sensorId,
                sensorName,
                unit,
                datasensor.getValue(),
                recordedAt
        );
    }

        private LocalDateTime parseFromChart(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        if (value.length() == 10) {
            LocalDate date = LocalDate.parse(value);
            return date.atStartOfDay();
        }

        return LocalDateTime.parse(
                value,
                DateTimeFormatter.ofPattern(
                        "yyyy-MM-dd HH:mm:ss"
                )
        );
    }

    private LocalDateTime parseToChart(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        if (value.length() == 10) {
            LocalDate date = LocalDate.parse(value);
            return date.atTime(LocalTime.MAX);
        }

        return LocalDateTime.parse(
                value,
                DateTimeFormatter.ofPattern(
                        "yyyy-MM-dd HH:mm:ss"
                )
        );
    }
}