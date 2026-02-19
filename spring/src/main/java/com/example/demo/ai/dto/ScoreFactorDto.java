package com.example.demo.ai.dto;

public class ScoreFactorDto {
    private String name;
    private double value;
    private double weight;
    private String description;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public double getValue() { return value; }
    public void setValue(double value) { this.value = value; }
    public double getWeight() { return weight; }
    public void setWeight(double weight) { this.weight = weight; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
