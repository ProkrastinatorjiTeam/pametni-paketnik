FROM node:20-bullseye

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    g++ \
    libopencv-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
e
COPY package*.json ./
RUN npm ci

COPY . .

RUN g++ -O3 -o compress/compressor \
    compress/source/main.cpp \
    compress/source/DCTCompressor.cpp \
    -I compress/source \
    $(pkg-config --cflags --libs opencv4)

RUN ls -l compress/compressor

RUN chmod +x compress/compressor

RUN mkdir -p public/images public/temp

EXPOSE 3000

CMD ["npm", "start"]