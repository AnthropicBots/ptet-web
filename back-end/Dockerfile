# Use official Node.js Alpine image for a smaller footprint
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first for better layer caching
COPY package*.json ./

# Install dependencies (only production if preferred, but doing all for dev)
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on (matching typical Express setups)
EXPOSE 5000

# Start the application using nodemon for development
# (assuming npm run dev is configured to use nodemon in package.json)
CMD ["npm", "run", "dev"]
