package com.capstone.ebookstore.service;

import com.capstone.ebookstore.dto.PaymentDTO;
import com.capstone.ebookstore.dto.PaymentRequest;
import com.capstone.ebookstore.entity.Order;
import com.capstone.ebookstore.entity.Payment;
import com.capstone.ebookstore.repository.OrderRepository;
import com.capstone.ebookstore.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;

    @Transactional
    public PaymentDTO processPayment(PaymentRequest request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + request.getOrderId()));

        if (order.getStatus() == Order.OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot pay for a cancelled order");
        }

        // Simulate payment processing
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setAmount(order.getTotalAmount());
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setTransactionId("TXN-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        payment.setStatus(Payment.PaymentStatus.SUCCESS);
        payment.setProcessedAt(LocalDateTime.now());

        if (request.getCardNumber() != null && request.getCardNumber().length() >= 4) {
            payment.setMaskedCardNumber("**** **** **** " +
                    request.getCardNumber().substring(request.getCardNumber().length() - 4));
        }

        payment = paymentRepository.save(payment);

        // Update order status to CONFIRMED
        order.setStatus(Order.OrderStatus.CONFIRMED);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        return toDTO(payment);
    }

    public PaymentDTO getPaymentByOrderId(Long orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for order: " + orderId));
        return toDTO(payment);
    }

    private PaymentDTO toDTO(Payment p) {
        return new PaymentDTO(
                p.getId(),
                p.getOrder().getId(),
                p.getOrder().getOrderNumber(),
                p.getAmount(),
                p.getPaymentMethod(),
                p.getStatus(),
                p.getTransactionId(),
                p.getMaskedCardNumber(),
                p.getProcessedAt()
        );
    }
}
