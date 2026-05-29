# Use the official Maven image with OpenJDK 17 pre-installed
FROM maven:3.8.5-openjdk-17

# Set the working directory inside the container
WORKDIR /app

# Copy the entire project (both backend and frontend) into the container
COPY . .

# Change working directory to the backend where pom.xml resides
WORKDIR /app/backend

# Compile the Java backend classes
RUN mvn compile

# Expose port 3000 (Render will override and bind dynamically to $PORT automatically)
EXPOSE 3000

# Run the web server
CMD ["mvn", "exec:java"]
