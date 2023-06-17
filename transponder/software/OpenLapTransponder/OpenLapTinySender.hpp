
#ifndef _OPENRC_TINY_IR_SENDER_HPP
#define _OPENRC_TINY_IR_SENDER_HPP

#include <Arduino.h>

//#define ENABLE_NEC2_REPEATS // Instead of sending / receiving the NEC special repeat code, send / receive the original frame for repeat.

#if defined(DEBUG) && !defined(LOCAL_DEBUG)
#define LOCAL_DEBUG
#else
//#define LOCAL_DEBUG // This enables debug output only for this file
#endif

#include "OpenLapTinyIR.h" // Defines protocol timings
#include "digitalWriteFast.h"

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

/*
 * Generate 38 kHz IR signal by bit banging
 */
void sendMark(uint8_t aSendPin, unsigned int aMarkMicros) {
    unsigned long tStartMicros = micros();
    unsigned long tNextPeriodEnding = tStartMicros;
    unsigned long tMicros;
    do {
        /*
         * Generate pulse
         */
        noInterrupts(); // do not let interrupts extend the short on period
        digitalWriteFast(aSendPin, HIGH);
        delayMicroseconds(8); // 8 us for a 30 % duty cycle for 38 kHz
        digitalWriteFast(aSendPin, LOW);
        interrupts(); // Enable interrupts - to keep micros correct- for the longer off period 3.4 us until receive ISR is active (for 7 us + pop's)

        /*
         * PWM pause timing and end check
         * Minimal pause duration is 4.3 us
         */
        tNextPeriodEnding += 26; // for 38 kHz
        do {
            tMicros = micros(); // we have only 4 us resolution for AVR @16MHz
            /*
             * Exit the forever loop if aMarkMicros has reached
             */
            unsigned int tDeltaMicros = tMicros - tStartMicros;
#if defined(__AVR__)
            // Just getting variables and check for end condition takes minimal 3.8 us
            if (tDeltaMicros >= aMarkMicros - (112 / (F_CPU / MICROS_IN_ONE_SECOND))) { // To compensate for call duration - 112 is an empirical value
#else
                if (tDeltaMicros >= aMarkMicros) {
#endif
                return;
            }
        } while (tMicros < tNextPeriodEnding);
    } while (true);
}

void sendOpenLap(uint8_t aSendPin, uint16_t aCommand, bool precalculated = false){
  
  if(!precalculated)
  {
    aCommand = (aCommand << 4) | (crc4(aCommand));
  }
  
  pinModeFast(aSendPin, OUTPUT);

  // send header
  sendMark(aSendPin, RCLT_HEADER);
  delayMicroseconds(RCLT_GAP);
  uint16_t tData;

  tData = aCommand;
  
  // Send data
  for (uint_fast8_t i = 0; i < RCLT_BITS; i+=2) {
      sendMark(aSendPin, RCLT_CRUMB_MARK); // constant mark length

      switch(tData & 0x3){
        case 0x0:
          delayMicroseconds(RCLT_00);
          break;
        case 0x1:
          delayMicroseconds(RCLT_01);
          break;
        case 0x2:
          delayMicroseconds(RCLT_10);
          break;
        default:
          delayMicroseconds(RCLT_11);
          break;
      }

      tData >>= 2; // shift command for next bit
  }
  // send stop bit
  sendMark(aSendPin, RCLT_CRUMB_MARK);
}

#if defined(LOCAL_DEBUG)
#undef LOCAL_DEBUG
#endif
#endif // _OPENLAP_TINY_IR_SENDER_HPP