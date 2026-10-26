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
// Tất cả API trong Controller đều bắt đầu bằng /dashboard
@RequestMapping("/dashboard")
// Cho phép Frontend từ mọi domain gọi API
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DatasensorRepository datasensorRepository;

    public DashboardController(
            DatasensorRepository datasensorRepository) {

        this.datasensorRepository = datasensorRepository;
    }
// API lấy dữ liệu cảm biến mới nhất
    @GetMapping("/sensors/latest")
    public ApiResponse<List<LatestSensorResponse>> getLatestSensors() {
// Gọi Repository để lấy dữ liệu cảm biến mới nhất
        List<Datasensor> latestData =
                datasensorRepository.findLatestSensorData();
// Kiểm tra Database có dữ liệu hay không
        if (latestData.isEmpty()) {
            return new ApiResponse<>(
                    false,
                    null,
                    "Không có dữ liệu cảm biến"
            );
        }
// Chuyển dữ liệu Datasensor thành dữ liệu trả về cho Frontend
        List<LatestSensorResponse> data =
                latestData.stream()
                        .map(this::convertToResponse)
                        .toList();
// Trả dữ liệu cảm biến mới nhất về Frontend
        return new ApiResponse<>(
                true,
                data,
                "Lấy dữ liệu cảm biến mới nhất thành công"
        );
    }
// API lấy dữ liệu dùng để vẽ biểu đồ
        @GetMapping("/sensors/chart")
    public ApiResponse<List<SensorChartResponse>> getSensorChart(
// Nhận ID cảm biến từ URL nếu Frontend có gửi
            @RequestParam(required = false)
            Integer sensor_id,
// Nhận thời gian bắt đầu nếu Frontend có gửi
            @RequestParam(required = false)
            String from,
// Nhận thời gian kết thúc nếu Frontend có gửi
            @RequestParam(required = false)
            String to,
// Nhận số lượng điểm tối đa cần lấy, mặc định là 50
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
// Khai báo thời gian bắt đầu
        LocalDateTime fromDateTime;
        LocalDateTime toDateTime;
// Chuyển from từ String sang LocalDateTime
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
// Nếu Frontend không gửi from thì dùng thời điểm 01/01/2000
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
// Khai báo danh sách ID của các cảm biến cần lấy
       
        List<Integer> sensorIds;

if (sensor_id != null) {
    sensorIds = List.of(sensor_id);
} else {
    sensorIds = List.of(1, 2, 3);
}
// Tạo danh sách để lưu kết quả của các biểu đồ
List<SensorChartResponse> result = new java.util.ArrayList<>();
// Quy định định dạng thời gian trả về Frontend
DateTimeFormatter formatter =
        DateTimeFormatter.ofPattern(
                "yyyy-MM-dd HH:mm:ss"
        );
// Lặp qua từng cảm biến cần lấy dữ liệu
for (Integer currentSensorId : sensorIds) {
// Gọi Repository lấy dữ liệu của cảm biến hiện tại
    List<Datasensor> sensorData =
            datasensorRepository.findChartData(
                    currentSensorId,
                    fromDateTime,
                    toDateTime
            );

    if (sensorData.isEmpty()) {
        continue;
    }
// Nếu số điểm lấy được lớn hơn limit
    if (sensorData.size() > limit) {
    sensorData = sensorData.subList(0, limit); // Chỉ giữ lại số điểm tối đa bằng limit
}

sensorData = new java.util.ArrayList<>(sensorData);
java.util.Collections.reverse(sensorData); // Đảo ngược thứ tự các điểm dữ liệu

    Datasensor first = sensorData.get(0); // Lấy phần tử đầu tiên để lấy thông tin cảm biến

    Integer sensorId =
            first.getSensor().getIdSensor(); // Lấy ID của cảm biến

    String sensorName =
            first.getSensor().getName();

    String unit;
// Xác định đơn vị dựa vào ID cảm biến
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
// Chuyển từng Datasensor thành một ChartPoint
// Lấy giá trị và thời gian của từng bản ghi
    List<ChartPoint> points =
            sensorData.stream()
                    .map(d -> new ChartPoint(  
                            d.getValue(),
                            d.getRecordedAt()
                                    .format(formatter)
                    ))
                    .toList();
// Tạo dữ liệu biểu đồ cho cảm biến hiện tại
    result.add(
            new SensorChartResponse(
                    sensorId,
                    sensorName,
                    unit,
                    points
            )
    );
}
// Kiểm tra toàn bộ cảm biến có dữ liệu hay không
if (result.isEmpty()) {
    return new ApiResponse<>(
            false,
            null,
            "Không có dữ liệu biểu đồ"
    );
}
// Trả toàn bộ dữ liệu biểu đồ về Frontend
return new ApiResponse<>(
        true,
        result,
        "Lấy dữ liệu biểu đồ thành công"
);        
    }
    
// Chuyển dữ liệu Datasensor thành LatestSensorResponse
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
        // Chuyển thời gian sang chuỗi
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
        // Chuyển thời gian sang chuỗi
        if (value.length() == 10) {
            LocalDate date = LocalDate.parse(value); // Chuyển chuỗi thành LocalDate
            return date.atStartOfDay(); // Thêm thời gian 00:00:00
        }
// Nếu có cả ngày và giờ thì chuyển trực tiếp sang LocalDateTime
        return LocalDateTime.parse(
                value,
                DateTimeFormatter.ofPattern(
                        "yyyy-MM-dd HH:mm:ss"
                )
        );
    }
// Chuyển thời gian to từ String sang LocalDateTime
    private LocalDateTime parseToChart(String value) {
// Nếu to không được gửi thì trả về null
        if (value == null || value.isBlank()) {
            return null;
        }
// Nếu chỉ có ngày thì lấy thời điểm cuối ngày
        if (value.length() == 10) {
            LocalDate date = LocalDate.parse(value);
            return date.atTime(LocalTime.MAX);
        }
// Nếu có cả ngày và giờ thì chuyển trực tiếp sang LocalDateTime
        return LocalDateTime.parse(
                value,
                DateTimeFormatter.ofPattern(
                        "yyyy-MM-dd HH:mm:ss"
                )
        );
    }
}