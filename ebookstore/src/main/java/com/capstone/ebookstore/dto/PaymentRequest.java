package com.capstone.ebookstore.dto;

import com.capstone.ebookstore.entity.Payment;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PaymentRequest {

    @NotNull
    private Long orderId;

    @NotNull
    private Payment.PaymentMethod paymentMethod;

    private String cardNumber;
    private String cardExpiry;
    private String cardCvv;
    private String upiId;
}
