# 1. Use an official Node.js runtime as the base image
FROM node:20-alpine

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# 4. Install dependencies
# Use 'npm ci' for faster, reliable production installs
#RUN npm ci --only=production
RUN npm ci --omit=dev

# 5. Copy the rest of the application code
COPY . .

# 6. Expose the port the app runs on
EXPOSE 3000

# 7. Define the command to start the application
CMD ["node", "bot.js"]

