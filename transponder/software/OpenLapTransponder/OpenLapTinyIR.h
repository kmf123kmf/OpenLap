#ifndef _OPENLAP_TINY_IR_H
#define _OPENLAP_TINY_IR_H

#include <Arduino.h>
/*
 * Designed for Vishay TSOP38338 (https://www.vishay.com/docs/81743/tsop381.pdf)
 *
 * Based on Philips RC-MM protocol (https://www.sbprojects.net/knowledge/ir/rcmm.php)
 * 
 * 14 bits (10 data + 4 bit CRC)
 * Message is encoded 2 bits at a time resulting in variable length
 * Best and worst case times (theoretical):
 *       HEADER + GAP +  MARK + CRUMB  + STOP MARK
 *   Best = 364 + 260 + 7(182 + 260  ) + 182        =  3.900 ms
 *   Worst= 364 + 260 + 7(182 + 806  ) + 182        =  7.722 ms
 *
 */

#define RCLT_BITS                 14
#define RCLT_CRUMB_MARK           182                                 // 7 cycles at 38 khz. Going down to 6 does work, but is not as reliable.  
#define RCLT_HEADER               (2*RCLT_CRUMB_MARK) 
#define RCLT_GAP                  260                                 // 10 cycles
#define RCLT_00                   260
#define RCLT_01                   (RCLT_00 + RCLT_CRUMB_MARK)
#define RCLT_10                   (RCLT_00 + 2 * RCLT_CRUMB_MARK)
#define RCLT_11                   (RCLT_00 + 3 * RCLT_CRUMB_MARK)
#define RCLT_TIMEOUT              (RCLT_00 + 4 * RCLT_CRUMB_MARK)

extern void handleReceivedOpenLapIRData(uint16_t aCommand); 

#if !defined(MICROS_IN_ONE_SECOND)
#define MICROS_IN_ONE_SECOND 1000000L
#endif

#if !defined(MICROS_IN_ONE_MILLI)
#define MICROS_IN_ONE_MILLI 1000L
#endif

/*
 * Macros for comparing timing values
 */
#define crumbLower(aDuration)   (aDuration-(RCLT_CRUMB_MARK/2))
#define crumbUpper(aDuration)   (aDuration+(RCLT_CRUMB_MARK/2))

#define lowerValue25Percent(aDuration)   (aDuration - (aDuration / 4))
#define upperValue25Percent(aDuration)   (aDuration + (aDuration / 4))
#define lowerValue50Percent(aDuration)   (aDuration / 2) // (aDuration - (aDuration / 2))
#define upperValue50Percent(aDuration)   (aDuration + (aDuration / 2))

/*
 * The states for the state machine
 */
#define IR_RECEIVER_STATE_WAITING_FOR_START_MARK        0
#define IR_RECEIVER_STATE_WAITING_FOR_START_SPACE       1
#define IR_RECEIVER_STATE_WAITING_FOR_FIRST_DATA_MARK   2
#define IR_RECEIVER_STATE_WAITING_FOR_DATA_SPACE        3
#define IR_RECEIVER_STATE_WAITING_FOR_DATA_MARK         4
#define IR_RECEIVER_STATE_WAITING_FOR_STOP_MARK         5
/**
 * Control and data variables of the state machine for TinyReceiver
 */
struct TinyIRReceiverStruct {
    /*
     * State machine
     */
    uint32_t LastChangeMicros;      ///< Microseconds of last Pin Change Interrupt.
    uint8_t IRReceiverState;        ///< The state of the state machine.
    uint8_t IRRawDataBitCounter;    ///< How many bits are currently contained in raw data.
    /*
     * Data
     */
    uint8_t Flags; // Bit coded flags. Can contain one of the bits: IRDATA_FLAGS_IS_REPEAT and IRDATA_FLAGS_PARITY_FAILED
    uint16_t IRRawDataMask01 = 0x1;
    uint16_t IRRawDataMask10 = 0x2;
    uint16_t IRRawDataMask11 = 0x3;
    uint16_t IRRawData;            ///< The current raw data.
};

/*
 * Definitions for member TinyIRReceiverCallbackDataStruct.Flags
 * From IRremoteInt.h
 */
#define IRDATA_FLAGS_EMPTY              0x00
#define IRDATA_FLAGS_IS_REPEAT          0x01
#define IRDATA_FLAGS_IS_AUTO_REPEAT     0x02 // not used here, overwritten with _IRDATA_FLAGS_IS_SHORT_REPEAT
#define IRDATA_FLAGS_PARITY_FAILED      0x04 ///< the current (autorepeat) frame violated parity check

/**
 * Can be used by the callback to transfer received data to main loop for further processing.
 * E.g. with volatile struct TinyIRReceiverCallbackDataStruct sCallbackData;
 */
struct TinyIRReceiverCallbackDataStruct {
  uint16_t Command;
  uint8_t Flags; // Bit coded flags. Can contain one of the bits: IRDATA_FLAGS_IS_REPEAT and IRDATA_FLAGS_PARITY_FAILED
  bool justWritten; ///< Is set true if new data is available. Used by the main loop, to avoid multiple evaluations of the same IR frame.
};

bool initPCIInterruptForTinyReceiver();
bool enablePCIInterruptForTinyReceiver();
void disablePCIInterruptForTinyReceiver();
bool isTinyReceiverIdle();
void printTinyReceiverResultMinimal(Print *aSerial, uint16_t aCommand, uint8_t aFlags);

void sendOpenLap(uint8_t aSendPin, uint16_t aCommand, bool precalculated);

#endif // _OPENLAP_TINY_IR_H