#pragma once
#include <fstream>
#include <vector>

class BitWriter {
public:
    explicit BitWriter(std::ostream &os) : m_os(os), m_buffer(0), m_bit_count(0) {
    }

    ~BitWriter() {
        flush();
    }

    void write(uint64_t data, int num_bits) {
        for (int i = num_bits - 1; i >= 0; --i) {
            bool bit = (data >> i) & 1;
            m_buffer = (m_buffer << 1) | bit;
            m_bit_count++;
            if (m_bit_count == 8) {
                m_os.put(m_buffer);
                m_buffer = 0;
                m_bit_count = 0;
            }
        }
    }

    void flush() {
        if (m_bit_count > 0) {
            m_buffer <<= (8 - m_bit_count);
            m_os.put(m_buffer);
            m_buffer = 0;
            m_bit_count = 0;
        }
    }

private:
    std::ostream &m_os;
    uint8_t m_buffer;
    int m_bit_count;
};

class BitReader {
public:
    explicit BitReader(std::istream &is) : m_is(is), m_buffer(0), m_bit_count(0) {
    }

    uint64_t read(int num_bits) {
        uint64_t data = 0;
        for (int i = 0; i < num_bits; ++i) {
            if (m_bit_count == 0) {
                m_is.get(reinterpret_cast<char &>(m_buffer));
                if (m_is.gcount() == 0) {
                    throw std::runtime_error("End of file reached unexpectedly.");
                }
                m_bit_count = 8;
            }
            bool bit = (m_buffer >> 7) & 1;
            data = (data << 1) | bit;
            m_buffer <<= 1;
            m_bit_count--;
        }
        return data;
    }

    bool eof() const {
        return m_is.peek() == EOF && m_bit_count == 0;
    }

private:
    std::istream &m_is;
    uint8_t m_buffer;
    int m_bit_count;
};
