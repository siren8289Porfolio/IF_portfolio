package com.example.demo.ai.client;

import com.example.demo.ai.dto.ExplainRequestDto;
import com.example.demo.ai.dto.ExplainResponseDto;
import com.example.demo.ai.dto.ScoreRequestDto;
import com.example.demo.ai.dto.ScoreResponseDto;
import com.example.demo.global.exception.AiServiceTimeoutException;
import com.example.demo.global.exception.AiServiceUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.net.SocketTimeoutException;
import java.util.concurrent.TimeoutException;

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
     * @throws AiServiceTimeoutException 타임아웃
     * @throws AiServiceUnavailableException 연결 실패·4xx/5xx 등
     */
    public ScoreResponseDto score(ScoreRequestDto request) {
        try {
            return restTemplate.postForObject(baseUrl + "/score", request, ScoreResponseDto.class);
        } catch (RestClientException e) {
            throw mapAiException("AI score API 호출 실패", e);
        }
    }

    /**
     * FastAPI POST /explain 호출.
     * @throws AiServiceTimeoutException 타임아웃
     * @throws AiServiceUnavailableException 연결 실패·4xx/5xx 등
     */
    public ExplainResponseDto explain(ExplainRequestDto request) {
        try {
            return restTemplate.postForObject(baseUrl + "/explain", request, ExplainResponseDto.class);
        } catch (RestClientException e) {
            throw mapAiException("AI explain API 호출 실패", e);
        }
    }

    static RuntimeException mapAiException(String prefix, RestClientException e) {
        if (isTimeout(e)) {
            return new AiServiceTimeoutException(prefix + ": timeout", e);
        }
        return new AiServiceUnavailableException(prefix + ": " + e.getMessage(), e);
    }

    private static boolean isTimeout(Throwable t) {
        Throwable cur = t;
        while (cur != null) {
            if (cur instanceof SocketTimeoutException
                    || cur instanceof TimeoutException
                    || (cur instanceof ResourceAccessException && containsTimeoutMessage(cur))) {
                return true;
            }
            if (containsTimeoutMessage(cur) && cur instanceof ResourceAccessException) {
                return true;
            }
            String msg = cur.getMessage();
            if (msg != null) {
                String lower = msg.toLowerCase();
                if (lower.contains("timed out") || lower.contains("timeout")) {
                    return true;
                }
            }
            cur = cur.getCause();
        }
        return false;
    }

    private static boolean containsTimeoutMessage(Throwable t) {
        String msg = t.getMessage();
        if (msg == null) {
            return false;
        }
        String lower = msg.toLowerCase();
        return lower.contains("timed out") || lower.contains("timeout") || lower.contains("read timed out");
    }
}
