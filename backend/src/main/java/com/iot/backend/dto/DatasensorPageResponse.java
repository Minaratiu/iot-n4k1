package com.iot.backend.dto;

import java.util.List;

public class DatasensorPageResponse {

    private List<DatasensorResponse> items;
    private PaginationResponse pagination;

    public DatasensorPageResponse(
            List<DatasensorResponse> items,
            PaginationResponse pagination) {

        this.items = items;
        this.pagination = pagination;
    }

    public List<DatasensorResponse> getItems() {
        return items;
    }

    public PaginationResponse getPagination() {
        return pagination;
    }
}