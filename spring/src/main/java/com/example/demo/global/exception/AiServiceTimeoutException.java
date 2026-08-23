package com.example.demo.global.exception;

public class AiServiceTimeoutException extends RuntimeException {

    public AiServiceTimeoutException(String message, Throwable cause) {
        super(message, cause);
    }

    public AiServiceTimeoutException(String message) {
        super(message);
    }
}
