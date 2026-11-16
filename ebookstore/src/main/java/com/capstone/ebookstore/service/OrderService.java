package com.capstone.ebookstore.service;

import com.capstone.ebookstore.dto.AddressDTO;
import com.capstone.ebookstore.dto.OrderDTO;
import com.capstone.ebookstore.dto.PlaceOrderRequest;
import com.capstone.ebookstore.entity.*;
import com.capstone.ebookstore.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;

    @Transactional
    public OrderDTO placeOrder(String email, PlaceOrderRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Cart not found"));

        if (cart.getItems().isEmpty()) {
            throw new IllegalArgumentException("Cart is empty");
        }

        Address address = addressRepository.findByIdAndUserId(request.getShippingAddressId(), user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Address not found"));

        // Calculate total
        BigDecimal total = cart.getItems().stream()
                .map(item -> item.getProduct().getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Redeem gift points (1 point = $0.01)
        int pointsToRedeem = Math.min(request.getPointsToRedeem() == null ? 0 : request.getPointsToRedeem(),
                user.getGiftPoints());
        BigDecimal discount = BigDecimal.valueOf(pointsToRedeem).multiply(new BigDecimal("0.01"));
        total = total.subtract(discount).max(BigDecimal.ZERO);

        Order order = new Order();
        order.setOrderNumber("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        order.setUser(user);
        order.setShippingAddress(address);
        order.setTotalAmount(total);
        order.setPointsRedeemed(pointsToRedeem);
        order.setStatus(Order.OrderStatus.CONFIRMED);
        order = orderRepository.save(order);

        // Create order items
        for (CartItem cartItem : cart.getItems()) {
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(cartItem.getProduct());
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setUnitPrice(cartItem.getProduct().getPrice());
            order.getItems().add(orderItem);

            // Decrease stock
            Product product = cartItem.getProduct();
            product.setStockQuantity(Math.max(0, product.getStockQuantity() - cartItem.getQuantity()));
            productRepository.save(product);
        }
        order = orderRepository.save(order);

        // Deduct points and award new points (1 point per $1 spent)
        user.setGiftPoints(user.getGiftPoints() - pointsToRedeem + total.intValue());
        userRepository.save(user);

        // Clear the cart (orphanRemoval deletes the rows)
        cart.getItems().clear();

        return toDTO(order);
    }

    public Page<OrderDTO> getUserOrders(String email, int page, int size) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return orderRepository.findByUserId(user.getId(),
                PageRequest.of(page, size, Sort.by("createdAt").descending()))
                .map(this::toDTO);
    }

    public OrderDTO getOrderById(String email, Long orderId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Order order = orderRepository.findByIdAndUserId(orderId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        return toDTO(order);
    }

    @Transactional
    public OrderDTO cancelOrder(String email, Long orderId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Order order = orderRepository.findByIdAndUserId(orderId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        if (order.getStatus() == Order.OrderStatus.SHIPPED || order.getStatus() == Order.OrderStatus.DELIVERED) {
            throw new IllegalArgumentException("Order cannot be cancelled after shipment");
        }

        // Check 48-hour window
        if (order.getCreatedAt().plusHours(48).isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Order cannot be cancelled after 48 hours");
        }

        order.setStatus(Order.OrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());

        // Restore gift points
        if (order.getPointsRedeemed() > 0) {
            user.setGiftPoints(user.getGiftPoints() + order.getPointsRedeemed());
            userRepository.save(user);
        }

        return toDTO(orderRepository.save(order));
    }

    private OrderDTO toDTO(Order order) {
        Address addr = order.getShippingAddress();
        AddressDTO addressDTO = addr == null ? null : new AddressDTO(
                addr.getId(), addr.getFullName(), addr.getStreet(), addr.getCity(),
                addr.getState(), addr.getPostalCode(), addr.getCountry(), addr.getPhone(), addr.isDefault());

        List<OrderDTO.OrderItemDTO> items = order.getItems().stream().map(item ->
                new OrderDTO.OrderItemDTO(
                        item.getProduct().getId(),
                        item.getProduct().getTitle(),
                        item.getProduct().getImageUrl(),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
                )).collect(Collectors.toList());

        return new OrderDTO(order.getId(), order.getOrderNumber(), order.getUser().getId(),
                order.getStatus(), addressDTO, items, order.getTotalAmount(),
                order.getPointsRedeemed(), order.getCreatedAt());
    }
}
