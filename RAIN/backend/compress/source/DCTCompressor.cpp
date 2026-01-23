#include "DCTCompressor.h"
#include "BitStream.h"

#include <opencv2/opencv.hpp>
#include <vector>
#include <cmath>
#include <iostream>

constexpr int BLOCK_SIZE = 8;
constexpr double PI = 3.14159265358979323846;

static double dct_cos_table[BLOCK_SIZE][BLOCK_SIZE];
static int zigzag_map[BLOCK_SIZE * BLOCK_SIZE][2];
static int inverse_zigzag_map[BLOCK_SIZE][BLOCK_SIZE];

void DCTCompressor::initialize_dct_tables() {
    static bool initialized = false;
    if (initialized) return;

    for (int i = 0; i < BLOCK_SIZE; i++) {
        for (int j = 0; j < BLOCK_SIZE; j++) {
            dct_cos_table[i][j] = cos((2.0 * i + 1.0) * j * PI / 16.0);
        }
    }

    const int map[BLOCK_SIZE * BLOCK_SIZE] = {
        0, 1, 5, 6, 14, 15, 27, 28,
        2, 4, 7, 13, 16, 26, 29, 42,
        3, 8, 12, 17, 25, 30, 41, 43,
        9, 11, 18, 24, 31, 40, 44, 53,
        10, 19, 23, 32, 39, 45, 52, 54,
        20, 22, 33, 38, 46, 51, 55, 60,
        21, 34, 37, 47, 50, 56, 59, 61,
        35, 36, 48, 49, 57, 58, 62, 63
    };

    for (int i = 0; i < BLOCK_SIZE * BLOCK_SIZE; i++) {
        zigzag_map[i][0] = map[i] / BLOCK_SIZE;
        zigzag_map[i][1] = map[i] % BLOCK_SIZE;
        inverse_zigzag_map[map[i] / BLOCK_SIZE][map[i] % BLOCK_SIZE] = i;
    }

    initialized = true;
}

double C(int i) {
    return (i == 0) ? 1.0 / sqrt(2.0) : 1.0;
}

int count_bits(int n) {
    if (n == 0) return 0;
    return static_cast<int>(floor(log2(abs(n))) + 1);
}

//Kompresija
void DCTCompressor::compress(const std::string &inputFile, const std::string &outputFile, int compressionFactor) {
    initialize_dct_tables();

    cv::Mat image = cv::imread(inputFile, cv::IMREAD_COLOR);
    if (image.empty()) {
        throw std::runtime_error("Could not open input file" + inputFile);
    }


    std::string original_ext = ".bmp";
    size_t dot_pos = inputFile.find_last_of(".");
    if (dot_pos != std::string::npos) {
        original_ext = inputFile.substr(dot_pos);
    }

    int original_rows = image.rows;
    int original_cols = image.cols;

    int padded_rows = (original_rows + BLOCK_SIZE - 1) & -BLOCK_SIZE;
    int padded_cols = (original_cols + BLOCK_SIZE - 1) & -BLOCK_SIZE;

    cv::Mat padded_image;
    cv::copyMakeBorder(image, padded_image, 0, padded_rows - original_rows, 0, padded_cols - original_cols,
                       cv::BORDER_REPLICATE, cv::Scalar(0, 0, 0));

    std::vector<cv::Mat> channels;
    cv::split(padded_image, channels);

    std::ofstream ofs(outputFile, std::ios::binary);
    if (!ofs) {
        throw std::runtime_error("Could not open output file: " + outputFile);
    }
    BitWriter writer(ofs);

    writer.write(static_cast<uint8_t>(original_ext.length()), 8);
    for (char c: original_ext) {
        writer.write(static_cast<uint8_t>(c), 8);
    }

    writer.write(original_cols, 32);
    writer.write(original_rows, 32);

    for (cv::Mat &channel: channels) {
        for (int y = 0; y < padded_rows; y += BLOCK_SIZE) {
            for (int x = 0; x < padded_cols; x += BLOCK_SIZE) {
                cv::Mat block(channel, cv::Rect(x, y, BLOCK_SIZE, BLOCK_SIZE));
                cv::Mat block64f;
                block.convertTo(block64f, CV_64F);
                block64f -= 128.0;

                cv::Mat dct_coeffs(BLOCK_SIZE, BLOCK_SIZE, CV_64F);
                for (int u = 0; u < BLOCK_SIZE; u++) {
                    for (int v = 0; v < BLOCK_SIZE; v++) {
                        double sum = 0.0;
                        for (int i = 0; i < BLOCK_SIZE; i++) {
                            for (int j = 0; j < BLOCK_SIZE; j++) {
                                sum += block64f.at<double>(i, j) * dct_cos_table[i][u] * dct_cos_table[j][v];
                            }
                        }
                        dct_coeffs.at<double>(u, v) = 0.25 * C(u) * C(v) * sum;
                    }
                }

                std::vector<int> zigzag_coeffs(BLOCK_SIZE * BLOCK_SIZE);
                for (int i = 0; i < BLOCK_SIZE * BLOCK_SIZE; i++) {
                    int r = zigzag_map[i][0];
                    int c = zigzag_map[i][1];
                    zigzag_coeffs[i] = static_cast<int>(round(dct_coeffs.at<double>(r, c)));
                }

                //Kvantizacija 2.nacin
                for (int i = BLOCK_SIZE * BLOCK_SIZE - 1; i >= BLOCK_SIZE * BLOCK_SIZE - compressionFactor && i > 0; i
                     --) {
                    zigzag_coeffs[i] = 0;
                }

                //DC koef
                writer.write(zigzag_coeffs[0], 12);

                //AC koeficienti z RLE
                int zero_run_length = 0;
                for (int i = 1; i < BLOCK_SIZE * BLOCK_SIZE; i++) {
                    if (zigzag_coeffs[i] == 0) {
                        zero_run_length++;
                    } else {
                        //pravila A in C
                        if (zero_run_length > 0) {
                            //Pravilo A
                            writer.write(0, 1); //Tip 0
                            writer.write(zero_run_length, 6);
                        } else {
                            //Pravilo C
                            writer.write(1, 1); // Tip 1
                        }

                        //velikost in vrednost
                        int ac_val = zigzag_coeffs[i];
                        int size = count_bits(ac_val);
                        writer.write(size, 4);

                        //VLI kodiranje
                        if (ac_val > 0) {
                            writer.write(ac_val, size);
                        } else {
                            writer.write(ac_val + (1 << size) - 1, size);
                        }

                        zero_run_length = 0;
                    }
                }

                //Pravilo B
                if (zero_run_length > 0) {
                    writer.write(0, 1);
                    writer.write(0, 6);
                }
            }
        }
    }

    writer.flush();
}

//dekompresija
std::string DCTCompressor::decompress(const std::string &inputFile, const std::string &outputFile) {
    initialize_dct_tables();

    std::ifstream ifs(inputFile, std::ios::binary);
    if (!ifs) {
        throw std::runtime_error("Could not open input file: " + inputFile);
    }
    BitReader reader(ifs);

    uint8_t ext_len = reader.read(8);
    std::string original_ext;
    for (uint8_t i = 0; i < ext_len; ++i) {
        original_ext += static_cast<char>(reader.read(8));
    }

    int original_cols = reader.read(32);
    int original_rows = reader.read(32);

    int padded_rows = (original_rows + BLOCK_SIZE - 1) & -BLOCK_SIZE;
    int padded_cols = (original_cols + BLOCK_SIZE - 1) & -BLOCK_SIZE;

    std::vector<cv::Mat> channels;
    for (int i = 0; i < 3; ++i) {
        channels.push_back(cv::Mat::zeros(padded_rows, padded_cols, CV_8UC1));
    }

    for (cv::Mat &channel: channels) {
        for (int y = 0; y < padded_rows; y += BLOCK_SIZE) {
            for (int x = 0; x < padded_cols; x += BLOCK_SIZE) {
                std::vector<int> zigzag_coeffs(BLOCK_SIZE * BLOCK_SIZE, 0);

                //DC koef
                int dc_val = reader.read(12);
                if (dc_val & (1 << 11)) {
                    dc_val |= ~((1 << 12) - 1); // Sign extend
                }
                zigzag_coeffs[0] = dc_val;

                //AC koef
                int current_coeff = 1;
                while (current_coeff < BLOCK_SIZE * BLOCK_SIZE) {
                    int type = reader.read(1);
                    if (type == 0) {
                        //Pravilo A ali B
                        int run_length = reader.read(6);
                        if (run_length == 0) {
                            //Pravilo B
                            break;
                        } else {
                            //Pravilo A
                            current_coeff += run_length;
                            if (current_coeff >= BLOCK_SIZE * BLOCK_SIZE) break;

                            int size = reader.read(4);
                            if (size == 0) {
                                zigzag_coeffs[current_coeff] = 0;
                            } else {
                                int code = reader.read(size);
                                int ac_val;
                                int threshold = 1 << (size - 1);
                                if (code >= threshold) {
                                    ac_val = code; //Pozitivna vrednost
                                } else {
                                    ac_val = code - (1 << size) + 1; //Negativna vrednost
                                }
                                zigzag_coeffs[current_coeff] = ac_val;
                            }
                            current_coeff++;
                        }
                    } else {
                        //Pravilo C
                        int size = reader.read(4);
                        if (size == 0) {
                            zigzag_coeffs[current_coeff] = 0;
                        } else {
                            int code = reader.read(size);
                            int ac_val;
                            int threshold = 1 << (size - 1);
                            if (code >= threshold) {
                                ac_val = code; //Pozitivna vrednost
                            } else {
                                ac_val = code - (1 << size) + 1; //Negativna vrednost
                            }
                            zigzag_coeffs[current_coeff] = ac_val;
                        }
                        current_coeff++;
                    }
                }

                //Inverzni zigzag
                cv::Mat dct_coeffs(BLOCK_SIZE, BLOCK_SIZE, CV_64F);
                for (int r = 0; r < BLOCK_SIZE; ++r) {
                    for (int c = 0; c < BLOCK_SIZE; ++c) {
                        dct_coeffs.at<double>(r, c) = zigzag_coeffs[inverse_zigzag_map[r][c]];
                    }
                }

                //IDCT
                cv::Mat block64f(BLOCK_SIZE, BLOCK_SIZE, CV_64F);
                for (int i = 0; i < BLOCK_SIZE; ++i) {
                    for (int j = 0; j < BLOCK_SIZE; ++j) {
                        double sum = 0.0;
                        for (int u = 0; u < BLOCK_SIZE; ++u) {
                            for (int v = 0; v < BLOCK_SIZE; ++v) {
                                sum += C(u) * C(v) * dct_coeffs.at<double>(u, v) * dct_cos_table[i][u] * dct_cos_table[
                                    j][v];
                            }
                        }
                        block64f.at<double>(i, j) = 0.25 * sum;
                    }
                }

                block64f += 128.0;

                cv::Mat dest_block(channel, cv::Rect(x, y, BLOCK_SIZE, BLOCK_SIZE));
                block64f.convertTo(dest_block, CV_8UC1, 1, 0);
            }
        }
    }

    cv::Mat merged_image;
    cv::merge(channels, merged_image);

    cv::Mat final_image(merged_image, cv::Rect(0, 0, original_cols, original_rows));

    const std::string finalOutputFile = outputFile + original_ext;

    if (!cv::imwrite(finalOutputFile, final_image)) {
        throw std::runtime_error("Failed to save the decompressed image to " + finalOutputFile);
    }

    return finalOutputFile;
}
