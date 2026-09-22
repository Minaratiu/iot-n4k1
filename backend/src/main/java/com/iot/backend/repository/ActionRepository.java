package com.iot.backend.repository;

import com.iot.backend.entity.Action;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ActionRepository extends JpaRepository<Action, Integer> {

    // =========================================================
    // Lấy action mới nhất của một thiết bị
    // Dùng trong DeviceController
    // =========================================================
    Optional<Action> findTopByDevice_IdDeviceOrderByCreatedAtDesc(
            Integer deviceId
    );


    // =========================================================
    // Tìm action đang loading mới nhất của một thiết bị
    // Dùng trong MqttService khi ESP gửi device_response
    // =========================================================
    Optional<Action> findTopByDevice_IdDeviceAndStatusOrderByCreatedAtDesc(
            Integer deviceId,
            String status
    );


    // =========================================================
    // Lọc lịch sử theo thiết bị + phân trang
    // Giữ lại để không ảnh hưởng code cũ
    // =========================================================
    Page<Action> findByDevice_IdDevice(
            Integer deviceId,
            Pageable pageable
    );


    // =========================================================
    // LẤY LỊCH SỬ BẬT/TẮT
    //
    // Có thể lọc:
    // - deviceId
    // - action
    // - status
    //
    // Nếu giá trị filter = null thì bỏ qua điều kiện đó.
    //
    // Ví dụ:
    //
    // deviceId = 1
    // action = "on"
    // status = "loading"
    //
    // => chỉ lấy LED1 + bật + đang loading
    // =========================================================
    @Query("""
        SELECT a
        FROM Action a
        WHERE (:deviceId IS NULL OR a.device.idDevice = :deviceId)
          AND (:action IS NULL OR LOWER(a.action) = LOWER(:action))
          AND (:status IS NULL OR LOWER(a.status) = LOWER(:status))
        ORDER BY a.createdAt DESC
    """)
    Page<Action> findHistory(
            @Param("deviceId") Integer deviceId,
            @Param("action") String action,
            @Param("status") String status,
            Pageable pageable
    );
}