package com.example.demo.ai;

import com.example.demo.ai.service.AIRiskService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GradeOfTest {

    @Test
    void mapsKoreanBands() {
        assertEquals("LOW", AIRiskService.gradeOf("낮음"));
        assertEquals("MID", AIRiskService.gradeOf("보통"));
        assertEquals("HIGH", AIRiskService.gradeOf("높음"));
        assertEquals("HIGH", AIRiskService.gradeOf("매우 높음"));
        assertEquals("MID", AIRiskService.gradeOf(null));
        assertEquals("MID", AIRiskService.gradeOf("unknown"));
    }
}
