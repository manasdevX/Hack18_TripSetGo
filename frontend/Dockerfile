FROM node:20-alpine
WORKDIR /app

# Next.js SWC & native node modules build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

COPY package*.json ./

# Handle peer dependency mapping issues common with latest React/Next combos
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
