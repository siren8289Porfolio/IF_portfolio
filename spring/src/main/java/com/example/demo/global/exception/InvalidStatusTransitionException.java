package com.example.demo.global.exception;

import com.example.demo.assessment.entity.AssessmentStatus;

public class InvalidStatusTransitionException extends RuntimeException {

    public InvalidStatusTransitionException(AssessmentStatus from, AssessmentStatus to) {
        super("Invalid status transition: " + from + " → " + to);
    }

    public InvalidStatusTransitionException(String message) {
        super(message);
    }
}
