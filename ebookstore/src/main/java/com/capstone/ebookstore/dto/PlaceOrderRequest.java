package com.capstone.ebookstore.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PlaceOrderRequest {

    @NotNull
    private Long shippingAddressId;

    private Integer pointsToRedeem = 0;
}
