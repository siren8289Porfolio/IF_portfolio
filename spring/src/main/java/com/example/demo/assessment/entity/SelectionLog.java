package com.example.demo.assessment.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "selection_log")
public class SelectionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "selection_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assessment_id")
    private Assessment assessment;

    @Column(name = "selected_at")
    private OffsetDateTime selectedAt;

    @Column(name = "delivered_flag")
    private Boolean deliveredFlag;

    // getters/setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Assessment getAssessment() {
        return assessment;
    }

    public void setAssessment(Assessment assessment) {
        this.assessment = assessment;
    }

    public OffsetDateTime getSelectedAt() {
        return selectedAt;
    }

    public void setSelectedAt(OffsetDateTime selectedAt) {
        this.selectedAt = selectedAt;
    }

    public Boolean getDeliveredFlag() {
        return deliveredFlag;
    }

    public void setDeliveredFlag(Boolean deliveredFlag) {
        this.deliveredFlag = deliveredFlag;
    }
}

