package com.capstone.ebookstore;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:postgresql://localhost:5432/ebookstore_db",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class EbookstoreApplicationTests {

    @Test
    void contextLoads() {
    }
}
