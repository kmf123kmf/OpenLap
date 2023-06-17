#ifndef _OPENLAP_TINY_IR_RECEIVER_HPP
#define _OPENLAP_TINY_IR_RECEIVER_HPP

#include <Arduino.h>

#if defined(DEBUG) && !defined(LOCAL_DEBUG)
#define LOCAL_DEBUG
#else
//#define LOCAL_DEBUG // This enables debug output only for this file
#endif

//#define DISABLE_PARITY_CHECKS // Disable parity checks. Saves 48 bytes of program memory.

#include "OpenLapTinyIR.h" // If not defined, it defines IR_RECEIVE_PIN, IR_FEEDBACK_LED_PIN and TINY_RECEIVER_USE_ARDUINO_ATTACH_INTERRUPT

static const uint8_t crc4_tab[] = {
	0x0, 0x7, 0xe, 0x9, 0xb, 0xc, 0x5, 0x2,
	0x1, 0x6, 0xf, 0x8, 0xa, 0xd, 0x4, 0x3,
};

/**
 * crc4 - calculate the 4-bit crc of a value.
 * @c:    starting crc4
 * @x:    value to checksum
 * @bits: number of bits in @x to checksum
 *
 * Returns the crc4 value of @x, using polynomial 0b10111.
 *
 * The @x value is treated as left-aligned, and bits above @bits are ignored
 * in the crc calculations.
 */
static uint8_t crc4(uint8_t c, uint64_t x, int bits)
{
	int i;
	/* mask off anything above the top bit */
	x &= (1ull << bits) - 1;
	/* Align to 4-bits */
	bits = (bits + 3) & ~0x3;
	/* Calculate crc4 over four-bit nibbles, starting at the MSbit */
	for (i = bits - 4; i >= 0; i -= 4)
		c = crc4_tab[c ^ ((x >> i) & 0xf)];
	return c;
}

static uint8_t crc4(uint16_t x)
{
    return crc4(0, x, 16);
}

#include "digitalWriteFast.h"

#if defined(DEBUG)
#define LOCAL_DEBUG_ATTACH_INTERRUPT
#else
//#define LOCAL_DEBUG_ATTACH_INTERRUPT  // to see if attachInterrupt() or static interrupt (by register tweaking) is used
#endif
#if defined(TRACE)
#define LOCAL_TRACE_STATE_MACHINE
#else
//#define LOCAL_TRACE_STATE_MACHINE  // to see the state of the ISR (Interrupt Service Routine) state machine
#endif

//#define _IR_MEASURE_TIMING        // Activate this if you want to enable internal hardware timing measurement.
//#define _IR_TIMING_TEST_PIN 7
TinyIRReceiverStruct TinyIRReceiverControl;

/*
 * Set input pin and output pin definitions etc.
 */
#if defined(IR_INPUT_PIN)
#warning "IR_INPUT_PIN is deprecated, use IR_RECEIVE_PIN"
#define IR_RECEIVE_PIN  IR_INPUT_PIN
#endif
#if !defined(IR_RECEIVE_PIN)
#if defined(__AVR_ATtiny1616__) || defined(__AVR_ATtiny3216__) || defined(__AVR_ATtiny3217__)
#warning "IR_RECEIVE_PIN is not defined, so it is set to 10"
#define IR_RECEIVE_PIN    10
#elif defined(__AVR_ATtiny816__)
#warning "IR_RECEIVE_PIN is not defined, so it is set to 14"
#define IR_RECEIVE_PIN    14
#else
#warning "IR_RECEIVE_PIN is not defined, so it is set to 2"
#define IR_RECEIVE_PIN    2
#endif
#endif

#if !defined(IR_FEEDBACK_LED_PIN) && defined(LED_BUILTIN)
#define IR_FEEDBACK_LED_PIN    LED_BUILTIN
#endif

#if !( \
   (defined(__AVR_ATtiny25__) || defined(__AVR_ATtiny45__) || defined(__AVR_ATtiny85__)) /* ATtinyX5 */ \
|| defined(__AVR_ATtiny88__) /* MH-ET LIVE Tiny88 */ \
|| defined(__AVR_ATmega1280__) || defined(__AVR_ATmega1281__) || defined(__AVR_ATmega2560__) || defined(__AVR_ATmega2561__) \
|| defined(__AVR_ATmega16U4__) || defined(__AVR_ATmega32U4__) \
|| defined(__AVR_ATmega8__) || defined(__AVR_ATmega48__) || defined(__AVR_ATmega48P__) || defined(__AVR_ATmega48PB__) || defined(__AVR_ATmega88P__) || defined(__AVR_ATmega88PB__) \
|| defined(__AVR_ATmega168__) || defined(__AVR_ATmega168PA__) || defined(__AVR_ATmega168PB__) || defined(__AVR_ATmega328__) || defined(__AVR_ATmega328P__) || defined(__AVR_ATmega328PB__) \
  /* ATmegas with ports 0,1,2 above and ATtiny167 only 2 pins below */ \
|| ( (defined(__AVR_ATtiny87__) || defined(__AVR_ATtiny167__)) && ( (defined(ARDUINO_AVR_DIGISPARKPRO) && ((IR_RECEIVE_PIN == 3) || (IR_RECEIVE_PIN == 9))) /*ATtinyX7(digisparkpro) and pin 3 or 9 */\
        || (! defined(ARDUINO_AVR_DIGISPARKPRO) && ((IR_RECEIVE_PIN == 3) || (IR_RECEIVE_PIN == 14)))) ) /*ATtinyX7(ATTinyCore) and pin 3 or 14 */ \
)
#define TINY_RECEIVER_USE_ARDUINO_ATTACH_INTERRUPT // Cannot use any static ISR vector here. In other cases we have code provided for generating interrupt on pin change.
#endif

/**
 * Declaration of the callback function provided by the user application.
 * It is called every time a complete IR command or repeat was received.
 */
extern void handleReceivedIRData(uint16_t aAddress, uint8_t aCommand, bool isRepetition);

#if defined(LOCAL_DEBUG)
uint32_t sMicrosOfGap; // The length of the gap before the start bit
#endif
/**
 * The ISR (Interrupt Service Routine) of TinyIRRreceiver.
 * It handles the NEC protocol decoding and calls the user callback function on complete.
 * 5 us + 3 us for push + pop for a 16MHz ATmega
 */
void IRPinChangeInterruptHandler(void) {
#if defined(_IR_MEASURE_TIMING) && defined(_IR_TIMING_TEST_PIN)
    digitalWriteFast(_IR_TIMING_TEST_PIN, HIGH); // 2 clock cycles
#endif
    /*
     * Save IR input level
     * Negative logic, true / HIGH means inactive / IR space, LOW / false means IR mark.
     */
    uint_fast8_t tIRLevel = digitalReadFast(IR_RECEIVE_PIN);

#if !defined(NO_LED_FEEDBACK_CODE) && defined(IR_FEEDBACK_LED_PIN)
    digitalWriteFast(IR_FEEDBACK_LED_PIN, !tIRLevel);
#endif

    /*
     * 1. compute microseconds after last change
     */
    // Repeats can be sent after a pause, which is longer than 64000 microseconds, so we need a 32 bit value for check of repeats
    uint32_t tCurrentMicros = micros();
    uint32_t tMicrosOfMarkOrSpace32 = tCurrentMicros - TinyIRReceiverControl.LastChangeMicros;
    uint16_t tMicrosOfMarkOrSpace = tMicrosOfMarkOrSpace32;

    TinyIRReceiverControl.LastChangeMicros = tCurrentMicros;

    uint8_t tState = TinyIRReceiverControl.IRReceiverState;

#if defined(LOCAL_TRACE_STATE_MACHINE)
    Serial.print(tState);
    if(tIRLevel == LOW) Serial.print(F(" -")); else Serial.print(F(" +"));

    Serial.print(tMicrosOfMarkOrSpace);
//    Serial.print(F(" I="));
//    Serial.print(tIRLevel);
    Serial.print('|');
#endif

    if (tIRLevel == LOW) {
        /*
         * We have a mark here
         */

        if (tMicrosOfMarkOrSpace > RCLT_TIMEOUT) {
            // timeout -> must reset state machine
            tState = IR_RECEIVER_STATE_WAITING_FOR_START_MARK;
        }
        if (tState == IR_RECEIVER_STATE_WAITING_FOR_START_MARK) {
            // We are at the beginning of the header mark, check timing at the next transition
            tState = IR_RECEIVER_STATE_WAITING_FOR_START_SPACE;
            TinyIRReceiverControl.Flags = IRDATA_FLAGS_EMPTY;
#if defined(LOCAL_TRACE)
            sMicrosOfGap = tMicrosOfMarkOrSpace32;
#endif

        }
        else if (tState == IR_RECEIVER_STATE_WAITING_FOR_FIRST_DATA_MARK) {
            if (tMicrosOfMarkOrSpace >= lowerValue25Percent(RCLT_GAP)
                    && tMicrosOfMarkOrSpace <= upperValue25Percent(RCLT_GAP)) {
                /*
                 * We have a valid data header space here -> initialize data
                 */
                TinyIRReceiverControl.IRRawDataBitCounter = 0;
                TinyIRReceiverControl.IRRawData = 0;
                TinyIRReceiverControl.IRRawDataMask01 = 1;
                TinyIRReceiverControl.IRRawDataMask10 = 2;
                TinyIRReceiverControl.IRRawDataMask11 = 3;
                tState = IR_RECEIVER_STATE_WAITING_FOR_DATA_SPACE;
            } else {
                // This parts are optimized by the compiler into jumps to one code :-)
                // Wrong length -> reset state
                tState = IR_RECEIVER_STATE_WAITING_FOR_START_MARK;
            }
        }
        else if (tState == IR_RECEIVER_STATE_WAITING_FOR_DATA_MARK) {
            // Check data space length
            if (tMicrosOfMarkOrSpace >= crumbLower(RCLT_00) && tMicrosOfMarkOrSpace <= crumbUpper(RCLT_11) ) {
                // We have a valid crumb here
                tState = IR_RECEIVER_STATE_WAITING_FOR_DATA_SPACE;
                
                if (tMicrosOfMarkOrSpace >= crumbLower(RCLT_00) && tMicrosOfMarkOrSpace <= crumbUpper(RCLT_00)) {
                    // do nothing
                } else if (tMicrosOfMarkOrSpace >= crumbLower(RCLT_01) && tMicrosOfMarkOrSpace <= crumbUpper(RCLT_01)) {
                    TinyIRReceiverControl.IRRawData |= TinyIRReceiverControl.IRRawDataMask01;
                } else if (tMicrosOfMarkOrSpace >= crumbLower(RCLT_10) && tMicrosOfMarkOrSpace <= crumbUpper(RCLT_10)) {
                    TinyIRReceiverControl.IRRawData |= TinyIRReceiverControl.IRRawDataMask10;
                } else /*if (tMicrosOfMarkOrSpace >= crumbLower(RCLT_11) && tMicrosOfMarkOrSpace <= crumbUpper(RCLT_11))*/ {
                    TinyIRReceiverControl.IRRawData |= TinyIRReceiverControl.IRRawDataMask11;
                }
                // prepare for next crumb
                TinyIRReceiverControl.IRRawDataMask01 <<= 2;
                TinyIRReceiverControl.IRRawDataMask10 <<= 2;
                TinyIRReceiverControl.IRRawDataMask11 <<= 2;
                TinyIRReceiverControl.IRRawDataBitCounter+=2;
            } else {
                // Wrong length -> reset state
                tState = IR_RECEIVER_STATE_WAITING_FOR_START_MARK;
            }
        } else {
            // error wrong state for the received level, e.g. if we missed one change interrupt -> reset state
            tState = IR_RECEIVER_STATE_WAITING_FOR_START_MARK;
        }
    }

    else {
        /*
         * We have a space here
         */
#if defined(RCLT_MARK_OFFSET)
        tMicrosOfMarkOrSpace += RCLT_MARK_OFFSET;
#endif
        if (tState == IR_RECEIVER_STATE_WAITING_FOR_START_SPACE) {
            /*
             * Check length of header mark here
             */
            if (tMicrosOfMarkOrSpace >= lowerValue25Percent(RCLT_HEADER)
                    && tMicrosOfMarkOrSpace <= upperValue25Percent(RCLT_HEADER)) {
                tState = IR_RECEIVER_STATE_WAITING_FOR_FIRST_DATA_MARK;
            } else {
                // Wrong length of header mark -> reset state
                tState = IR_RECEIVER_STATE_WAITING_FOR_START_MARK;
            }
        }

        else if (tState == IR_RECEIVER_STATE_WAITING_FOR_DATA_SPACE) {
            // Check data mark length
            if (tMicrosOfMarkOrSpace >= lowerValue25Percent(RCLT_CRUMB_MARK)
                    && tMicrosOfMarkOrSpace <= upperValue50Percent(RCLT_CRUMB_MARK)) {
                /*
                 * We have a valid mark here, check for transmission complete, i.e. the mark of the stop bit
                 */
                if (TinyIRReceiverControl.IRRawDataBitCounter >= RCLT_BITS) {
                    /*
                     * Code complete -> optionally check parity
                     */
                    // Reset state for new start
                    tState = IR_RECEIVER_STATE_WAITING_FOR_START_MARK;

#if !defined(DISABLE_PARITY_CHECKS)
                    /*
                     * Check CRC
                     */
                    if( crc4(TinyIRReceiverControl.IRRawData) != 0)
                    {                    
                      TinyIRReceiverControl.Flags |= IRDATA_FLAGS_PARITY_FAILED;
#    if defined(LOCAL_DEBUG)
                        Serial.print(F("Checksum for command failed. Command="));
                        Serial.print(TinyIRReceiverControl.IRRawData >> 4, HEX);
                        Serial.print(F(" checksum="));
                        Serial.println(TinyIRReceiverControl.IRRawData & 0xf, HEX);
#    endif
                    }
#endif // !defined(DISABLE_PARITY_CHECKS)

#if !defined(ARDUINO_ARCH_MBED) && !defined(ESP32) // no Serial etc. in callback for ESP -> no interrupt required, WDT is running!
                    interrupts(); // enable interrupts, so delay() etc. works in callback
#endif
                    if((TinyIRReceiverControl.Flags & IRDATA_FLAGS_PARITY_FAILED) == 0){
                      handleReceivedOpenLapIRData(TinyIRReceiverControl.IRRawData >> 4);
                    }
                } else {
                    // not finished yet
                    tState = IR_RECEIVER_STATE_WAITING_FOR_DATA_MARK;
                }
            } else {
                // Wrong length -> reset state
                tState = IR_RECEIVER_STATE_WAITING_FOR_START_MARK;
            }
        } else {
            // error wrong state for the received level, e.g. if we missed one change interrupt -> reset state
            //Serial.print("-WrongState-");
            tState = IR_RECEIVER_STATE_WAITING_FOR_START_MARK;
        }
    }

    TinyIRReceiverControl.IRReceiverState = tState;
#ifdef _IR_MEASURE_TIMING
    digitalWriteFast(_IR_TIMING_TEST_PIN, LOW); // 2 clock cycles
#endif
}

bool isTinyReceiverIdle() {
    return (TinyIRReceiverControl.IRReceiverState == IR_RECEIVER_STATE_WAITING_FOR_START_MARK);
}

/**
 * Sets IR_RECEIVE_PIN mode to INPUT, and if IR_FEEDBACK_LED_PIN is defined, sets feedback LED output mode.
 * Then call enablePCIInterruptForTinyReceiver()
 */
bool initPCIInterruptForTinyReceiver() {
    pinModeFast(IR_RECEIVE_PIN, INPUT);

#if !defined(NO_LED_FEEDBACK_CODE) && defined(IR_FEEDBACK_LED_PIN)
    pinModeFast(IR_FEEDBACK_LED_PIN, OUTPUT);
#endif
    return enablePCIInterruptForTinyReceiver();
}

void printTinyReceiverResultMinimal(Print *aSerial, uint16_t aCommand, uint8_t aFlags)

        {
// Print only very short output, since we are in an interrupt context and do not want to miss the next interrupts of the repeats coming soon
    // Print only very short output, since we are in an interrupt context and do not want to miss the next interrupts of the repeats coming soon
    aSerial->print(F("C=0x"));
    aSerial->print(aCommand, HEX);
    if (aFlags == IRDATA_FLAGS_IS_REPEAT) {
        aSerial->print(F(" R"));
    }
#if !defined(DISABLE_PARITY_CHECKS)
    if (aFlags == IRDATA_FLAGS_PARITY_FAILED) {
        aSerial->print(F(" P"));
    }
#endif
    aSerial->println();
}

#if defined (LOCAL_DEBUG_ATTACH_INTERRUPT) && !defined(STR)
// Helper macro for getting a macro definition as string
#define STR_HELPER(x) #x
#define STR(x) STR_HELPER(x)
#endif

/**************************************************
 * Pin to interrupt mapping for different platforms
 **************************************************/
#if defined(__AVR_ATtiny816__) || defined(__AVR_ATtiny1616__) || defined(__AVR_ATtiny3216__) || defined(__AVR_ATtiny3217__)
#define USE_ATTACH_INTERRUPT_DIRECT

#elif !defined(__AVR__) || defined(TINY_RECEIVER_USE_ARDUINO_ATTACH_INTERRUPT)
// Default for all NON AVR platforms
#define USE_ATTACH_INTERRUPT

#else
#  if defined(__AVR_ATtiny25__) || defined(__AVR_ATtiny45__) || defined(__AVR_ATtiny85__)
#define USE_PCIE

#  elif defined(__AVR_ATtiny87__) || defined(__AVR_ATtiny167__)
#    if defined(ARDUINO_AVR_DIGISPARKPRO)
#      if (IR_RECEIVE_PIN == 3)
#define USE_INT0
#      elif (IR_RECEIVE_PIN == 9)
#define USE_INT1
#      else
#        error "IR_RECEIVE_PIN must be 9 or 3."
#      endif // if (IR_RECEIVE_PIN == 9)
#    else // defined(ARDUINO_AVR_DIGISPARKPRO)
#      if (IR_RECEIVE_PIN == 14)
#define USE_INT0
#      elif (IR_RECEIVE_PIN == 3)
#define USE_INT1
#      else
#        error "IR_RECEIVE_PIN must be 14 or 3."
#      endif // if (IR_RECEIVE_PIN == 14)
#    endif

#  elif (defined(__AVR_ATmega1280__) || defined(__AVR_ATmega2560__))
#    if (IR_RECEIVE_PIN == 21)
#define USE_INT0
#    elif (IR_RECEIVE_PIN == 20)
#define USE_INT1
#    else
#warning "No pin mapping for IR_RECEIVE_PIN to interrupt found -> attachInterrupt() is used now."
#define USE_ATTACH_INTERRUPT
#    endif

#  else // defined(__AVR_ATtiny25__)
/*
 * ATmegas + ATtiny88 here
 */
#    if (IR_RECEIVE_PIN == 2)
#define USE_INT0
#    elif (IR_RECEIVE_PIN == 3)
#define USE_INT1

#    elif IR_RECEIVE_PIN == 4 || IR_RECEIVE_PIN == 5 || IR_RECEIVE_PIN == 6 || IR_RECEIVE_PIN == 7
    //ATmega328 (Uno, Nano ) etc. Enable pin change interrupt 20 to 23 for port PD4 to PD7 (Arduino pin 4 to 7)
#define USE_PCINT2
#    elif IR_RECEIVE_PIN == 8 || IR_RECEIVE_PIN == 9 || IR_RECEIVE_PIN == 10 || IR_RECEIVE_PIN == 11 || IR_RECEIVE_PIN == 12 || IR_RECEIVE_PIN == 13
    //ATmega328 (Uno, Nano ) etc. Enable pin change interrupt 0 to 5 for port PB0 to PB5 (Arduino pin 8 to 13)
#define USE_PCINT0
#    elif IR_RECEIVE_PIN == A0 || IR_RECEIVE_PIN == A1 || IR_RECEIVE_PIN == A2 || IR_RECEIVE_PIN == A3 || IR_RECEIVE_PIN == A4 || IR_RECEIVE_PIN == A5
    //ATmega328 (Uno, Nano ) etc. Enable pin change interrupt 8 to 13 for port PC0 to PC5 (Arduino pin A0 to A5)
#define USE_PCINT1

#    else
#warning "No pin mapping for IR_RECEIVE_PIN to interrupt found -> attachInterrupt() is used now."
#define USE_ATTACH_INTERRUPT
#    endif // if (IR_RECEIVE_PIN == 2)
#  endif // defined(__AVR_ATtiny25__)
#endif // ! defined(__AVR__) || defined(TINY_RECEIVER_USE_ARDUINO_ATTACH_INTERRUPT)

/**
 * Initializes hardware interrupt generation according to IR_RECEIVE_PIN or use attachInterrupt() function.
 * @return true if interrupt was successfully enabled
 */
bool enablePCIInterruptForTinyReceiver() {
#if defined(_IR_MEASURE_TIMING) && defined(_IR_TIMING_TEST_PIN)
    pinModeFast(_IR_TIMING_TEST_PIN, OUTPUT);
#endif

#if defined(USE_ATTACH_INTERRUPT) || defined(USE_ATTACH_INTERRUPT_DIRECT)
#  if defined(USE_ATTACH_INTERRUPT)
#if defined(NOT_AN_INTERRUPT)
    if(digitalPinToInterrupt(IR_RECEIVE_PIN) == NOT_AN_INTERRUPT){
        return false;
    }
#endif
    // costs 112 bytes program memory + 4 bytes RAM
    attachInterrupt(digitalPinToInterrupt(IR_RECEIVE_PIN), IRPinChangeInterruptHandler, CHANGE);
#  else
    // 2.2 us more than version configured with macros and not compatible
    attachInterrupt(IR_RECEIVE_PIN, IRPinChangeInterruptHandler, CHANGE); // no extra pin mapping here
#  endif

#  if defined(LOCAL_DEBUG_ATTACH_INTERRUPT)
    Serial.println(F("Use attachInterrupt for pin=" STR(IR_RECEIVE_PIN)));
#  endif

#else
#  if defined(LOCAL_DEBUG_ATTACH_INTERRUPT)
    Serial.println(F("Use static interrupt for pin=" STR(IR_RECEIVE_PIN)));
#  endif
#  if defined(USE_INT0)
    // interrupt on any logical change
    EICRA |= _BV(ISC00);
    // clear interrupt bit
    EIFR |= 1 << INTF0;
    // enable interrupt on next change
    EIMSK |= 1 << INT0;

#  elif defined(USE_INT1)
    EICRA |= _BV(ISC10);
// clear interrupt bit
    EIFR |= 1 << INTF1;
// enable interrupt on next change
    EIMSK |= 1 << INT1;

#  elif defined(USE_PCIE) // For ATtiny85 etc.
    // use PinChangeInterrupt no INT0 for pin PB2
    PCMSK = _BV(IR_RECEIVE_PIN);
    // clear interrupt bit
    GIFR |= 1 << PCIF;
    // enable interrupt on next change
    GIMSK |= 1 << PCIE;

#  elif defined(USE_PCINT0)
    PCICR |= _BV(PCIE0);
    PCMSK0 = digitalPinToBitMask(IR_RECEIVE_PIN);
#  elif defined(USE_PCINT1)
    PCICR |= _BV(PCIE1);
    PCMSK1 = digitalPinToBitMask(IR_RECEIVE_PIN);
#  elif defined(USE_PCINT2)
    PCICR |= _BV(PCIE2);
    PCMSK2 = digitalPinToBitMask(IR_RECEIVE_PIN);
#  else
    return false;
#  endif
#endif // defined(USE_ATTACH_INTERRUPT)
    return true;
}

void disablePCIInterruptForTinyReceiver() {
#if defined(_IR_MEASURE_TIMING) && defined(_IR_TIMING_TEST_PIN)
    pinModeFast(_IR_TIMING_TEST_PIN, OUTPUT);
#endif

#if defined(USE_ATTACH_INTERRUPT) || defined(USE_ATTACH_INTERRUPT_DIRECT)
#  if defined(USE_ATTACH_INTERRUPT)
    detachInterrupt(digitalPinToInterrupt(IR_RECEIVE_PIN));
#  else
    detachInterrupt(IR_RECEIVE_PIN);
#  endif

#else
#  if defined(USE_INT0)
    // clear interrupt bit
    EIFR |= 1 << INTF0;
    // disable interrupt on next change
    EIMSK &= ~(1 << INT0);

#  elif defined(USE_INT1)
    // clear interrupt bit
    EIFR |= 1 << INTF1;
    // disable interrupt on next change
    EIMSK &= ~(1 << INT1);

#  elif defined(USE_PCIE) // For ATtiny85 etc.
    // clear interrupt bit
    GIFR |= 1 << PCIF;
    // disable interrupt on next change
    GIMSK &= ~(1 << PCIE);

#  elif defined(USE_PCINT0)
    PCICR &= ~(_BV(PCIE0));
#  elif defined(USE_PCINT1)
    PCICR &= ~(_BV(PCIE1));
#  elif defined(USE_PCINT2)
    PCICR &= ~(_BV(PCIE2));

#  endif
#endif // defined(USE_ATTACH_INTERRUPT)
}

/*
 * Specify the right INT0, INT1 or PCINT0 interrupt vector according to different pins and cores.
 * The default value of TINY_RECEIVER_USE_ARDUINO_ATTACH_INTERRUPT is set in TinyIRReceiver.h
 */
#if !(defined(USE_ATTACH_INTERRUPT) || defined(USE_ATTACH_INTERRUPT_DIRECT))
#  if defined(USE_INT0)
ISR(INT0_vect)

#  elif defined(USE_INT1)
ISR(INT1_vect)

#  elif defined(USE_PCIE) // For ATtiny85 etc.
// on ATtinyX5 we do not have a INT1_vect but we can use the PCINT0_vect
ISR(PCINT0_vect)

#  elif defined(USE_PCINT0)
ISR(PCINT0_vect)
#  elif defined(USE_PCINT1)
ISR(PCINT1_vect)
#  elif defined(USE_PCINT2)
ISR(PCINT2_vect)
#  else
void dummyFunctionToAvoidCompilerErrors()
#  endif
{
    IRPinChangeInterruptHandler();
}
#endif // !(defined(USE_ATTACH_INTERRUPT) || defined(USE_ATTACH_INTERRUPT_DIRECT))

#if defined(LOCAL_DEBUG_ATTACH_INTERRUPT)
#undef LOCAL_DEBUG_ATTACH_INTERRUPT
#endif
#if defined(LOCAL_TRACE_STATE_MACHINE)
#undef LOCAL_TRACE_STATE_MACHINE
#endif

#if defined(LOCAL_DEBUG)
#undef LOCAL_DEBUG
#endif
#endif // _OPENLAP_TINY_IR_RECEIVER_HPP