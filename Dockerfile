FROM node:18-alpine

WORKDIR /app

# Install build dependencies + Tectonic for LaTeX-to-PDF compilation
RUN apk add --no-cache python3 make g++ \
    && apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/v3.21/community tectonic

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
CMD ["npm", "start"]
