package com.iot.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class PaginationResponse {

    private long total;
    private int page;
    private int limit;

    @JsonProperty("total_pages")
    private int totalPages;

    public PaginationResponse(
            long total,
            int page,
            int limit,
            int totalPages) {

        this.total = total;
        this.page = page;
        this.limit = limit;
        this.totalPages = totalPages;
    }

    public long getTotal() {
        return total;
    }

    public int getPage() {
        return page;
    }

    public int getLimit() {
        return limit;
    }

    public int getTotalPages() {
        return totalPages;
    }
}