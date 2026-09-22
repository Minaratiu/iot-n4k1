package com.iot.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ChartPoint {

    private Double value;

    @JsonProperty("recorded_at")
    private String recordedAt;

    public ChartPoint(
            Double value,
            String recordedAt) {

        this.value = value;
        this.recordedAt = recordedAt;
    }

    public Double getValue() {
        return value;
    }

    public String getRecordedAt() {
        return recordedAt;
    }
}