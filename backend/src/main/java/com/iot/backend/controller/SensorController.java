package com.iot.backend.controller;

import com.iot.backend.dto.ApiResponse;
import com.iot.backend.dto.SensorResponse;
import com.iot.backend.entity.Sensor;
import com.iot.backend.repository.SensorRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sensors")
@CrossOrigin(origins = "*")
public class SensorController {

    private final SensorRepository sensorRepository;

    public SensorController(SensorRepository sensorRepository) {
        this.sensorRepository = sensorRepository;
    }

    @GetMapping
    public ApiResponse<List<SensorResponse>> getAllSensors() {

        List<SensorResponse> data = sensorRepository.findAll()
                .stream()
                .map(this::convertToResponse)
                .toList();

        return new ApiResponse<>(
                true,
                data,
                "Lấy danh sách cảm biến thành công"
        );
    }

    private SensorResponse convertToResponse(Sensor sensor) {

        String unit;

        switch (sensor.getIdSensor()) {
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

        return new SensorResponse(
                sensor.getIdSensor(),
                sensor.getName(),
                unit
        );
    }
}