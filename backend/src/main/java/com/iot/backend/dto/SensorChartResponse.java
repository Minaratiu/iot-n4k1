package com.iot.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public class SensorChartResponse {

    @JsonProperty("sensor_id")
    private Integer sensorId;

    @JsonProperty("sensor_name")
    private String sensorName;

    private String unit;

    private List<ChartPoint> points;

    public SensorChartResponse(
            Integer sensorId,
            String sensorName,
            String unit,
            List<ChartPoint> points) {

        this.sensorId = sensorId;
        this.sensorName = sensorName;
        this.unit = unit;
        this.points = points;
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

    public List<ChartPoint> getPoints() {
        return points;
    }
}