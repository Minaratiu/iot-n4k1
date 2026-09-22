package com.iot.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class DeviceResponse {

    private Integer id;

    private String name;

    @JsonProperty("mqtt_key")
    private String mqttKey;

    @JsonProperty("current_status")
    private String currentStatus;

    @JsonProperty("last_action_at")
    private String lastActionAt;

    public DeviceResponse(
            Integer id,
            String name,
            String mqttKey,
            String currentStatus,
            String lastActionAt
    ) {
        this.id = id;
        this.name = name;
        this.mqttKey = mqttKey;
        this.currentStatus = currentStatus;
        this.lastActionAt = lastActionAt;
    }

    public Integer getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getMqttKey() {
        return mqttKey;
    }

    public String getCurrentStatus() {
        return currentStatus;
    }

    public String getLastActionAt() {
        return lastActionAt;
    }
}