# Stage 1: Build the React/Vite App
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
# Install dependencies
RUN npm install
COPY . .
# Build the app (Vite creates a 'dist' folder)
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
# Copy the built files from Stage 1 to Nginx's folder
COPY --from=build /app/dist /usr/share/nginx/html
# React Router fix: Redirect 404s to index.html so refreshing pages works
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html index.htm; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
