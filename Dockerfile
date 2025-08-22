FROM node:18-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application (force TypeScript Vite config)
RUN npm run build

# Set environment variables
ENV NODE_ENV=production

# Expose the port Render will map at runtime
EXPOSE 5000

# Start the application
CMD ["npm", "run", "dev"]
