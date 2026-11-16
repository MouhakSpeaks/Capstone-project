package com.capstone.ebookstore.config;

import com.capstone.ebookstore.entity.Cart;
import com.capstone.ebookstore.entity.Category;
import com.capstone.ebookstore.entity.Product;
import com.capstone.ebookstore.entity.User;
import com.capstone.ebookstore.repository.CartRepository;
import com.capstone.ebookstore.repository.CategoryRepository;
import com.capstone.ebookstore.repository.ProductRepository;
import com.capstone.ebookstore.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Seeds an admin account and sample catalogue data on first startup (only when tables are empty). */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail("admin@bookstore.com")) {
            User admin = new User();
            admin.setFirstName("Admin");
            admin.setLastName("User");
            admin.setEmail("admin@bookstore.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole(User.Role.ADMIN);
            admin = userRepository.save(admin);
            Cart cart = new Cart();
            cart.setUser(admin);
            cartRepository.save(cart);
        }

        if (categoryRepository.count() > 0) {
            return;
        }

        Category tech = category("Technology", "Programming and software engineering");
        Category fiction = category("Fiction", "Novels and short stories");
        Category science = category("Science", "Popular science and research");

        product(tech, "Clean Code", "Robert C. Martin", "978-0132350884", "34.99", 50, "Prentice Hall", 4.7, 10);
        product(tech, "The Pragmatic Programmer", "Andrew Hunt", "978-0135957059", "39.99", 40, "Addison-Wesley", 4.8, 12);
        product(tech, "Designing Data-Intensive Applications", "Martin Kleppmann", "978-1449373320", "44.50", 25, "O'Reilly", 4.9, 8);
        product(fiction, "1984", "George Orwell", "978-0451524935", "9.99", 100, "Signet Classics", 4.6, 7);
        product(fiction, "To Kill a Mockingbird", "Harper Lee", "978-0061120084", "11.49", 80, "Harper Perennial", 4.8, 9);
        product(science, "A Brief History of Time", "Stephen Hawking", "978-0553380163", "15.99", 60, "Bantam", 4.5, 6);
        product(science, "Cosmos", "Carl Sagan", "978-0345539434", "16.99", 45, "Ballantine", 4.7, 11);
    }

    private Category category(String name, String description) {
        Category c = new Category();
        c.setName(name);
        c.setDescription(description);
        return categoryRepository.save(c);
    }

    private void product(Category category, String title, String author, String isbn,
                         String price, int stock, String brand, double rating, int deliveryDays) {
        Product p = new Product();
        p.setCategory(category);
        p.setTitle(title);
        p.setAuthor(author);
        p.setIsbn(isbn);
        p.setPrice(new BigDecimal(price));
        p.setStockQuantity(stock);
        p.setBrand(brand);
        p.setPublisher(brand);
        p.setRating(rating);
        p.setReviewCount(25);
        p.setTentativeDeliveryDate(LocalDate.now().plusDays(deliveryDays));
        productRepository.save(p);
    }
}
