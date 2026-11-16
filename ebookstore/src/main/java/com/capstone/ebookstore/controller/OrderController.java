package com.capstone.ebookstore.controller;

import com.capstone.ebookstore.dto.ApiResponse;
import com.capstone.ebookstore.dto.OrderDTO;
import com.capstone.ebookstore.dto.PlaceOrderRequest;
import com.capstone.ebookstore.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "Place orders and browse order history")
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @Operation(summary = "Place a new order from current cart")
    public ResponseEntity<ApiResponse<OrderDTO>> placeOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PlaceOrderRequest request) {
        OrderDTO order = orderService.placeOrder(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Order placed successfully", order));
    }

    @GetMapping
    @Operation(summary = "Get order history (Buy Again feature)")
    public ResponseEntity<ApiResponse<Page<OrderDTO>>> getOrderHistory(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                orderService.getUserOrders(userDetails.getUsername(), page, size)));
    }

    @GetMapping("/{orderId}")
    @Operation(summary = "Get a specific order by ID")
    public ResponseEntity<ApiResponse<OrderDTO>> getOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.success(
                orderService.getOrderById(userDetails.getUsername(), orderId)));
    }

    @PutMapping("/{orderId}/cancel")
    @Operation(summary = "Cancel an order (within 48 hours)")
    public ResponseEntity<ApiResponse<OrderDTO>> cancelOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.success("Order cancelled",
                orderService.cancelOrder(userDetails.getUsername(), orderId)));
    }
}
