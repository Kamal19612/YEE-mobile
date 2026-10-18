# Build
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon || true

COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test \
	&& cp build/libs/*.jar /workspace/app.jar

# Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# AAC/MP3 transcoding for Safari / iOS playback of Chrome WebM recordings
RUN apk add --no-cache ffmpeg \
	&& addgroup -S yee && adduser -S yee -G yee
USER yee

COPY --from=build /workspace/app.jar /app/app.jar

ENV SPRING_PROFILES_ACTIVE=prod \
	JAVA_OPTS="-XX:MaxRAMPercentage=75.0"

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
