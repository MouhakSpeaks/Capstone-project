package com.capstone.ebookstore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddressDTO {
    private Long id;
    private String fullName;
    private String street;
    private String city;
    private String state;
    private String postalCode;
    private String country;
    private String phone;
    @JsonProperty("isDefault")
    private boolean defaultAddress;
}
