#include <iostream>
#include <string>
#include "DCTCompressor.h"
#include "opencv2/opencv.hpp"
#include <opencv2/core/utils/logger.hpp>
#include <chrono>

void printUsage() {
    std::cerr << "Usage:\n"
            << "  For compression:   vaja1.exe compress <input_image> <output_name> <compression_factor>\n"
            << "  For decompression: vaja1.exe decompress <input_file.dct>  <output_name>\n"
            << "\nExample:\n"
            << "  vaja1.exe compress my_photo.png compressed 30\n"
            << "\n  vaja1.exe decompress compressed.dct restored\n";
}

int main(int argc, char *argv[]) {
    cv::utils::logging::setLogLevel(cv::utils::logging::LOG_LEVEL_WARNING);

    if (argc < 3) {
        printUsage();
        return 1;
    }

    const std::string mode = argv[1];
    const std::string inputFile = argv[2];
    const std::string outputFile = argv[3];

    DCTCompressor compressor;

    try {
        if (mode == "compress") {
            if (argc != 5) {
                printUsage();
                return 1;
            }

            std::string finalOutputFile = outputFile + ".dct";

            const int factor = std::stoi(argv[4]);
            if (factor < 0 || factor > 63) {
                std::cerr << "Error: Compression factor must be between 0 and 63." << std::endl;
                return 1;
            }

            compressor.compress(inputFile, finalOutputFile, factor);
        } else if (mode == "decompress") {
            if (argc != 4) {
                printUsage();
                return 1;
            }
            const std::string finalOutputFile = compressor.decompress(inputFile, outputFile);
        } else {
            std::cerr << "Error: Unknown mode '" << mode << "'.\n";
            printUsage();
            return 1;
        }
    } catch (const std::exception &e) {
        std::cerr << "An error occurred: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}
