#pragma once
#include <string>
#include <iostream>

class DCTCompressor{
  public:
    void compress(const std::string& inputFile, const std::string& outputFile, int compressionFactor);

    std::string decompress(const std::string &inputFile, const std::string &outputFile);

   private:
     static void initialize_dct_tables();
};