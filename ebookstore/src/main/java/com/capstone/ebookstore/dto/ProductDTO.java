package com.capstone.ebookstore.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO {
    private Long id;
    private String title;
    private String author;
    private String isbn;
    private String description;
    private BigDecimal price;
    private Integer stockQuantity;
    private String imageUrl;
    private String publisher;
    private String brand;
    private LocalDate publicationDate;
    private Double rating;
    private Integer reviewCount;
    private LocalDate tentativeDeliveryDate;
    private boolean active;
    private Long categoryId;
    private String categoryName;
}
