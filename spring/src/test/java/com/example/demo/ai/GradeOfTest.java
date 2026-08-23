package com.example.demo.ai;

import com.example.demo.ai.service.AIRiskService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GradeOfTest {

    @Test
    void pol002NumericBoundaries() {
        assertEquals("LOW", AIRiskService.gradeOf(0));
        assertEquals("LOW", AIRiskService.gradeOf(40));
        assertEquals("MID", AIRiskService.gradeOf(41));
        assertEquals("MID", AIRiskService.gradeOf(60));
        assertEquals("HIGH", AIRiskService.gradeOf(61));
        assertEquals("HIGH", AIRiskService.gradeOf(100));
    }

    @Test
    void mapsKoreanBandsForDisplay() {
        assertEquals("LOW", AIRiskService.gradeOfBand("낮음"));
        assertEquals("MID", AIRiskService.gradeOfBand("보통"));
        assertEquals("HIGH", AIRiskService.gradeOfBand("높음"));
        assertEquals("HIGH", AIRiskService.gradeOfBand("매우 높음"));
        assertEquals("MID", AIRiskService.gradeOfBand(null));
    }
}
