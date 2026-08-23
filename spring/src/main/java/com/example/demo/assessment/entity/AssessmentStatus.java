package com.example.demo.assessment.entity;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum AssessmentStatus {
    PENDING_AI,
    AI_COMPLETED,
    FINALIZED;

    private static final Map<AssessmentStatus, Set<AssessmentStatus>> ALLOWED_TRANSITIONS =
            new EnumMap<>(AssessmentStatus.class);

    static {
        ALLOWED_TRANSITIONS.put(PENDING_AI, EnumSet.of(AI_COMPLETED));
        ALLOWED_TRANSITIONS.put(AI_COMPLETED, EnumSet.of(FINALIZED));
        ALLOWED_TRANSITIONS.put(FINALIZED, EnumSet.noneOf(AssessmentStatus.class));
    }

    public boolean canTransitionTo(AssessmentStatus target) {
        if (target == null) {
            return false;
        }
        return ALLOWED_TRANSITIONS.getOrDefault(this, EnumSet.noneOf(AssessmentStatus.class)).contains(target);
    }

    public static Map<AssessmentStatus, Set<AssessmentStatus>> allowedTransitions() {
        return ALLOWED_TRANSITIONS;
    }
}
