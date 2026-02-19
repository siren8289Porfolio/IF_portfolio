package com.example.demo.ai.client;

import com.example.demo.ai.dto.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
public class AIClient {

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public AIClient(RestTemplate restTemplate,
                    @Value("${app.ai.base-url:http://localhost:8000}") String baseUrl) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    /**
     * FastAPI POST /score 호출.
     * @throws RestClientException 연결 실패/타임아웃/4xx·5xx 시
     */
    public ScoreResponseDto score(ScoreRequestDto request) {
        return restTemplate.postForObject(baseUrl + "/score", request, ScoreResponseDto.class);
    }

    /**
     * FastAPI POST /explain 호출.
     * @throws RestClientException 연결 실패/타임아웃/4xx·5xx 시
     */
    public ExplainResponseDto explain(ExplainRequestDto request) {
        return restTemplate.postForObject(baseUrl + "/explain", request, ExplainResponseDto.class);
    }
}
