package com.capstone.ebookstore.controller;

import com.capstone.ebookstore.dto.AddressDTO;
import com.capstone.ebookstore.dto.AddressRequest;
import com.capstone.ebookstore.dto.ApiResponse;
import com.capstone.ebookstore.dto.PaymentDTO;
import com.capstone.ebookstore.dto.PaymentRequest;
import com.capstone.ebookstore.service.AddressService;
import com.capstone.ebookstore.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Profile", description = "Manage addresses and payment")
public class UserController {

    private final AddressService addressService;
    private final PaymentService paymentService;

    // ──────────────── Addresses ─────────────────

    @GetMapping("/addresses")
    @Operation(summary = "Get all delivery addresses for the logged-in user")
    public ResponseEntity<ApiResponse<List<AddressDTO>>> getAddresses(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                addressService.getUserAddresses(userDetails.getUsername())));
    }

    @PostMapping("/addresses")
    @Operation(summary = "Add a new delivery address")
    public ResponseEntity<ApiResponse<AddressDTO>> addAddress(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Address added",
                addressService.addAddress(userDetails.getUsername(), request)));
    }

    @PutMapping("/addresses/{addressId}")
    @Operation(summary = "Update a delivery address")
    public ResponseEntity<ApiResponse<AddressDTO>> updateAddress(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long addressId,
            @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Address updated",
                addressService.updateAddress(userDetails.getUsername(), addressId, request)));
    }

    @DeleteMapping("/addresses/{addressId}")
    @Operation(summary = "Delete a delivery address")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long addressId) {
        addressService.deleteAddress(userDetails.getUsername(), addressId);
        return ResponseEntity.ok(ApiResponse.success("Address deleted", null));
    }

    // ──────────────── Payment ─────────────────

    @PostMapping("/payment")
    @Operation(summary = "Initiate payment for an order (Credit/Debit/UPI/Gift Points)")
    public ResponseEntity<ApiResponse<PaymentDTO>> processPayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Payment processed",
                paymentService.processPayment(request)));
    }

    @GetMapping("/payment/order/{orderId}")
    @Operation(summary = "Get payment details for an order")
    public ResponseEntity<ApiResponse<PaymentDTO>> getPaymentByOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getPaymentByOrderId(orderId)));
    }
}
