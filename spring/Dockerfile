# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /workspace

COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

COPY src ./src
RUN ./gradlew --no-daemon bootJar -x test

# ---- Run stage ----
FROM eclipse-temurin:17-jre-jammy AS run
WORKDIR /app

# HEALTHCHECK에 필요한 curl만 설치 (이미지 최소화 위해 apt 캐시는 정리)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# root 대신 전용 계정으로 실행 (최소 권한 원칙)
RUN groupadd -r spring && useradd -r -g spring spring
COPY --from=build /workspace/build/libs/*.jar /app/app.jar
USER spring

ENV SPRING_PROFILES_ACTIVE=default \
    JAVA_OPTS=""

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -sf http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
