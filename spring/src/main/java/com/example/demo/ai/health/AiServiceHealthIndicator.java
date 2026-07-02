package com.example.demo.ai.health;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * FastAPI AI 서비스({@code GET /health}) 연결 상태를 Spring Actuator health에 노출한다.
 * {@code /actuator/health} 응답의 {@code components.aiService}로 확인 가능하다.
 */
@Component("aiService")
public class AiServiceHealthIndicator implements HealthIndicator {

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public AiServiceHealthIndicator(RestTemplate restTemplate,
                                     @Value("${app.ai.base-url:http://localhost:8000}") String baseUrl) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    @Override
    public Health health() {
        try {
            restTemplate.getForEntity(baseUrl + "/health", String.class);
            return Health.up().withDetail("baseUrl", baseUrl).build();
        } catch (RestClientException ex) {
            return Health.down(ex).withDetail("baseUrl", baseUrl).build();
        }
    }
}
