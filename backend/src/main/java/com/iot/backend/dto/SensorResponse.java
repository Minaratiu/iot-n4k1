package com.iot.backend.dto;

public class SensorResponse {

    private Integer id;
    private String name;
    private String unit;

    public SensorResponse(Integer id, String name, String unit) {
        this.id = id;
        this.name = name;
        this.unit = unit;
    }

    public Integer getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getUnit() {
        return unit;
    }
}