package com.iot.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class DeviceControlResponse {

    @JsonProperty("action_id")
    private Integer actionId;

    @JsonProperty("device_id")
    private Integer deviceId;

    @JsonProperty("device_name")
    private String deviceName;

    private String action;
    private String status;

    @JsonProperty("created_at")
    private String createdAt;

    public DeviceControlResponse(
            Integer actionId,
            Integer deviceId,
            String deviceName,
            String action,
            String status,
            String createdAt
    ) {
        this.actionId = actionId;
        this.deviceId = deviceId;
        this.deviceName = deviceName;
        this.action = action;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Integer getActionId() {
        return actionId;
    }

    public Integer getDeviceId() {
        return deviceId;
    }

    public String getDeviceName() {
        return deviceName;
    }

    public String getAction() {
        return action;
    }

    public String getStatus() {
        return status;
    }

    public String getCreatedAt() {
        return createdAt;
    }
}