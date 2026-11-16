package com.capstone.ebookstore.service;

import com.capstone.ebookstore.dto.ProductDTO;
import com.capstone.ebookstore.dto.ProductRequest;
import com.capstone.ebookstore.entity.Category;
import com.capstone.ebookstore.entity.Product;
import com.capstone.ebookstore.repository.CategoryRepository;
import com.capstone.ebookstore.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public Page<ProductDTO> getAllProducts(int page, int size, String sortBy) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortBy).descending());
        return productRepository.findByActiveTrue(pageable).map(this::toDTO);
    }

    public Page<ProductDTO> getProductsByCategory(Long categoryId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return productRepository.findByCategoryIdAndActiveTrue(categoryId, pageable).map(this::toDTO);
    }

    public ProductDTO getProductById(Long id) {
        return productRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
    }

    public Page<ProductDTO> searchProducts(String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return productRepository.searchProducts(keyword, pageable).map(this::toDTO);
    }

    public List<ProductDTO> getRelatedProducts(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));
        Pageable pageable = PageRequest.of(0, 6);
        return productRepository.findRelatedProducts(product.getCategory().getId(), productId, pageable)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public ProductDTO createProduct(ProductRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + request.getCategoryId()));
        Product product = mapToProduct(new Product(), request, category);
        return toDTO(productRepository.save(product));
    }

    @Transactional
    public ProductDTO updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + request.getCategoryId()));
        mapToProduct(product, request, category);
        return toDTO(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
        product.setActive(false);
        productRepository.save(product);
    }

    private Product mapToProduct(Product product, ProductRequest req, Category category) {
        product.setTitle(req.getTitle());
        product.setAuthor(req.getAuthor());
        product.setIsbn(req.getIsbn());
        product.setDescription(req.getDescription());
        product.setPrice(req.getPrice());
        product.setStockQuantity(req.getStockQuantity());
        product.setImageUrl(req.getImageUrl());
        product.setPublisher(req.getPublisher());
        product.setBrand(req.getBrand());
        product.setPublicationDate(req.getPublicationDate());
        product.setTentativeDeliveryDate(req.getTentativeDeliveryDate());
        product.setCategory(category);
        return product;
    }

    public ProductDTO toDTO(Product p) {
        ProductDTO dto = new ProductDTO();
        dto.setId(p.getId());
        dto.setTitle(p.getTitle());
        dto.setAuthor(p.getAuthor());
        dto.setIsbn(p.getIsbn());
        dto.setDescription(p.getDescription());
        dto.setPrice(p.getPrice());
        dto.setStockQuantity(p.getStockQuantity());
        dto.setImageUrl(p.getImageUrl());
        dto.setPublisher(p.getPublisher());
        dto.setBrand(p.getBrand());
        dto.setPublicationDate(p.getPublicationDate());
        dto.setRating(p.getRating());
        dto.setReviewCount(p.getReviewCount());
        dto.setTentativeDeliveryDate(p.getTentativeDeliveryDate());
        dto.setActive(p.isActive());
        dto.setCategoryId(p.getCategory().getId());
        dto.setCategoryName(p.getCategory().getName());
        return dto;
    }
}
