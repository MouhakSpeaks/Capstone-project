package com.capstone.ebookstore.service;

import com.capstone.ebookstore.dto.AddressDTO;
import com.capstone.ebookstore.dto.AddressRequest;
import com.capstone.ebookstore.entity.Address;
import com.capstone.ebookstore.entity.User;
import com.capstone.ebookstore.repository.AddressRepository;
import com.capstone.ebookstore.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    public List<AddressDTO> getUserAddresses(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return addressRepository.findByUserId(user.getId()).stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public AddressDTO addAddress(String email, AddressRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Address address = new Address();
        address.setUser(user);
        mapRequest(address, request);
        return toDTO(addressRepository.save(address));
    }

    @Transactional
    public AddressDTO updateAddress(String email, Long addressId, AddressRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Address address = addressRepository.findByIdAndUserId(addressId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Address not found: " + addressId));
        mapRequest(address, request);
        return toDTO(addressRepository.save(address));
    }

    @Transactional
    public void deleteAddress(String email, Long addressId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        addressRepository.findByIdAndUserId(addressId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Address not found: " + addressId));
        addressRepository.deleteById(addressId);
    }

    private void mapRequest(Address address, AddressRequest req) {
        address.setFullName(req.getFullName());
        address.setStreet(req.getStreet());
        address.setCity(req.getCity());
        address.setState(req.getState());
        address.setPostalCode(req.getPostalCode());
        address.setCountry(req.getCountry());
        address.setPhone(req.getPhone());
        address.setDefault(req.isDefaultAddress());
    }

    public AddressDTO toDTO(Address a) {
        return new AddressDTO(a.getId(), a.getFullName(), a.getStreet(), a.getCity(),
                a.getState(), a.getPostalCode(), a.getCountry(), a.getPhone(), a.isDefault());
    }
}
