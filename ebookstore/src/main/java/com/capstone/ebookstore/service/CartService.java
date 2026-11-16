package com.capstone.ebookstore.service;

import com.capstone.ebookstore.dto.CartDTO;
import com.capstone.ebookstore.dto.CartItemRequest;
import com.capstone.ebookstore.entity.Cart;
import com.capstone.ebookstore.entity.CartItem;
import com.capstone.ebookstore.entity.Product;
import com.capstone.ebookstore.entity.User;
import com.capstone.ebookstore.repository.CartItemRepository;
import com.capstone.ebookstore.repository.CartRepository;
import com.capstone.ebookstore.repository.ProductRepository;
import com.capstone.ebookstore.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public CartDTO getCart(String email) {
        Cart cart = getOrCreateCart(email);
        return toDTO(cart);
    }

    @Transactional
    public CartDTO addToCart(String email, CartItemRequest request) {
        Cart cart = getOrCreateCart(email);
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + request.getProductId()));

        Optional<CartItem> existing = cartItemRepository.findByCartIdAndProductId(cart.getId(), product.getId());
        if (existing.isPresent()) {
            CartItem item = existing.get();
            item.setQuantity(item.getQuantity() + request.getQuantity());
            cartItemRepository.save(item);
        } else {
            CartItem item = new CartItem();
            item.setCart(cart);
            item.setProduct(product);
            item.setQuantity(request.getQuantity());
            cartItemRepository.save(item);
        }

        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);
        return toDTO(cartRepository.findById(cart.getId()).orElseThrow());
    }

    @Transactional
    public CartDTO updateCartItem(String email, Long cartItemId, int quantity) {
        Cart cart = getOrCreateCart(email);
        CartItem item = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new IllegalArgumentException("Cart item not found: " + cartItemId));

        if (!item.getCart().getId().equals(cart.getId())) {
            throw new IllegalArgumentException("Cart item does not belong to current user");
        }

        if (quantity <= 0) {
            cartItemRepository.delete(item);
        } else {
            item.setQuantity(quantity);
            cartItemRepository.save(item);
        }

        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);
        return toDTO(cartRepository.findById(cart.getId()).orElseThrow());
    }

    @Transactional
    public CartDTO removeFromCart(String email, Long cartItemId) {
        Cart cart = getOrCreateCart(email);
        CartItem item = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new IllegalArgumentException("Cart item not found: " + cartItemId));

        if (!item.getCart().getId().equals(cart.getId())) {
            throw new IllegalArgumentException("Cart item does not belong to current user");
        }

        cartItemRepository.delete(item);
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);
        return toDTO(cartRepository.findById(cart.getId()).orElseThrow());
    }

    @Transactional
    public void clearCart(String email) {
        Cart cart = getOrCreateCart(email);
        cart.getItems().clear();
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);
    }

    private Cart getOrCreateCart(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
        return cartRepository.findByUserId(user.getId()).orElseGet(() -> {
            Cart cart = new Cart();
            cart.setUser(user);
            return cartRepository.save(cart);
        });
    }

    private CartDTO toDTO(Cart cart) {
        List<CartDTO.CartItemDTO> items = cart.getItems().stream().map(item -> {
            BigDecimal subtotal = item.getProduct().getPrice()
                    .multiply(BigDecimal.valueOf(item.getQuantity()));
            return new CartDTO.CartItemDTO(
                    item.getId(),
                    item.getProduct().getId(),
                    item.getProduct().getTitle(),
                    item.getProduct().getImageUrl(),
                    item.getProduct().getPrice(),
                    item.getQuantity(),
                    subtotal
            );
        }).collect(Collectors.toList());

        BigDecimal total = items.stream()
                .map(CartDTO.CartItemDTO::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CartDTO(cart.getId(), cart.getUser().getId(), items, total);
    }
}
