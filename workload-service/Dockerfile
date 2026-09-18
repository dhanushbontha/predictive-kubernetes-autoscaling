# ==============================================================================
# Build Stage
# ==============================================================================
FROM maven:3.9.9-eclipse-temurin-21-jammy AS builder

WORKDIR /build

# Copy Maven POM and pre-fetch dependencies for efficient Docker layer caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy application source code and compile fat JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# ==============================================================================
# Runtime Stage
# ==============================================================================
FROM eclipse-temurin:21-jre-jammy

# Create non-privileged system user and group for container security
RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid appgroup --create-home appuser

WORKDIR /app

# Copy executable jar from builder stage
COPY --from=builder --chown=appuser:appgroup /build/target/workload-service-*.jar /app/workload-service.jar

# Run container as non-root user
USER appuser:appgroup

# Service port
EXPOSE 8084

# Optimized containerized JVM settings
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/workload-service.jar"]
