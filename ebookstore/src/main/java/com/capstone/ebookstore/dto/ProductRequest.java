package com.capstone.ebookstore.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String author;

    @NotBlank
    private String isbn;

    private String description;

    @NotNull
    @Positive
    private BigDecimal price;

    private Integer stockQuantity = 0;

    private String imageUrl;

    private String publisher;

    private String brand;

    private LocalDate publicationDate;

    private LocalDate tentativeDeliveryDate;

    @NotNull
    private Long categoryId;
}
