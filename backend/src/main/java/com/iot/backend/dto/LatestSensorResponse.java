package com.iot.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class LatestSensorResponse {

    @JsonProperty("sensor_id")
    private Integer sensorId;

    @JsonProperty("sensor_name")
    private String sensorName;

    private String unit;

    private Double value;

    @JsonProperty("recorded_at")
    private String recordedAt;

    public LatestSensorResponse(
            Integer sensorId,
            String sensorName,
            String unit,
            Double value,
            String recordedAt) {

        this.sensorId = sensorId;
        this.sensorName = sensorName;
        this.unit = unit;
        this.value = value;
        this.recordedAt = recordedAt;
    }

    public Integer getSensorId() {
        return sensorId;
    }

    public String getSensorName() {
        return sensorName;
    }

    public String getUnit() {
        return unit;
    }

    public Double getValue() {
        return value;
    }

    public String getRecordedAt() {
        return recordedAt;
    }
}