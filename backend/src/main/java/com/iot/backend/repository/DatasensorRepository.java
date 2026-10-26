package com.iot.backend.repository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import com.iot.backend.entity.Datasensor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;



public interface DatasensorRepository extends JpaRepository<Datasensor, Integer> {
 // Lấy dữ liệu cảm biến theo ID cảm biến
    Page<Datasensor> findBySensor_IdSensor(
            Integer sensorId,
            Pageable pageable
    );
  // Lấy dữ liệu trong khoảng thời gian
    Page<Datasensor> findByRecordedAtBetween(
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable
    );
  // Lọc theo ID cảm biến + khoảng thời gian
    Page<Datasensor> findBySensor_IdSensorAndRecordedAtBetween(
            Integer sensorId,
            LocalDateTime from,
            LocalDateTime to,
            Pageable pageable
    );
 // Lọc dữ liệu theo khoảng giá trị cảm biến
    Page<Datasensor> findByValueBetween(
            Double minValue,
            Double maxValue,
            Pageable pageable
    );
  // Lọc theo cảm biến + khoảng giá trị
    Page<Datasensor> findBySensor_IdSensorAndValueBetween(
            Integer sensorId,
            Double minValue,
            Double maxValue,
            Pageable pageable
    );
 // Lọc theo khoảng thời gian + khoảng giá trị
    Page<Datasensor> findByRecordedAtBetweenAndValueBetween(
            LocalDateTime from,
            LocalDateTime to,
            Double minValue,
            Double maxValue,
            Pageable pageable
    );
// Lọc theo:
    // 1. ID cảm biến
    // 2. Khoảng thời gian
    // 3. Khoảng giá trị
    Page<Datasensor> findBySensor_IdSensorAndRecordedAtBetweenAndValueBetween(
            Integer sensorId,
            LocalDateTime from,
            LocalDateTime to,
            Double minValue,
            Double maxValue,
            Pageable pageable
    );
// LẤY DỮ LIỆU MỚI NHẤT CỦA CÁC CẢM BIẾN
    @Query("""
    SELECT d
    FROM Datasensor d
    WHERE d.recordedAt = (
        SELECT MAX(d2.recordedAt)
        FROM Datasensor d2
        WHERE d2.sensor.idSensor = d.sensor.idSensor
    )
    ORDER BY d.sensor.idSensor
    """)
List<Datasensor> findLatestSensorData();
// Lấy dữ liệu của một cảm biến trong khoảng thời gian để sử dụng cho biểu đồ
    @Query("""
    SELECT d
    FROM Datasensor d
    WHERE d.sensor.idSensor = :sensorId
      AND d.recordedAt BETWEEN :from AND :to
    ORDER BY d.recordedAt DESC
    """)
List<Datasensor> findChartData(
        @Param("sensorId") Integer sensorId,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
);
}