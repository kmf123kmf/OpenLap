
#include <Arduino.h>
#include <EEPROM.h>
#include "digitalWriteFast.h"

#include "OpenLapTinySender.hpp"

#if defined(__AVR_ATtiny85__)
#define NO_SERIAL

/*Physical pin layout for PDIP/SOIC packages
 *          +-------+
 *   PB5 - 1|       |8 - VCC
 *   PB3 - 2|       |7 - PB2
 *   PB4 - 3|       |6 - PB1
 *   GND - 4|       |5 - PB0
 *          +-------+
 */

#define PDIP_PIN1 PIN_PB5  // Generally do not use.  Usually set as reset pin.
#define PDIP_PIN2 PIN_PB3
#define PDIP_PIN3 PIN_PB4
#define PDIP_PIN5 PIN_PB0
#define PDIP_PIN6 PIN_PB1
#define PDIP_PIN7 PIN_PB2

#define FLOATING_PIN                PDIP_PIN5
#define IR_SEND_PIN                 PDIP_PIN2
#define LED_PIN                     PDIP_PIN3
#define BUTTON_PIN                  PDIP_PIN7

#else

#define FLOATING_PIN                PIN_A5
#define IR_SEND_PIN                 PIN_A0
#define LED_PIN                     PIN_A1
#define BUTTON_PIN                  PIN_A2

#endif

// LED timings        
#define LED_ON_PERIOD               10
#define LED_OFF_PERIOD              990

#define LED_LEVEL                   85

// IR Send Repeat Delays        
#define MIN_REPEAT_DELAY            8   
#define MAX_REPEAT_DELAY            24 

#define BTN_DOWN                    LOW
#define BTN_UP                      HIGH

#define BTN_DEBOUNCE_PERIOD         25
#define LONG_PRESS_TIME             2000
#define BTN_INACTIVITY_TIMEOUT      10000

// Transponder operation modes
#define NORMAL_MODE                 0
#define PROGRAM_HUNDREDS_MODE       1
#define PROGRAM_TENS_MODE           2
#define PROGRAM_ONES_MODE           3

#define RESET_CLICKS                10
#define REPEAT_CLICK_TIME           500

//#define CLEAR_EEPROM

uint8_t operationMode = NORMAL_MODE;

/*
* Transponder IDs are 0 through 999 (inclusive)
*/
uint16_t transponderId = 0;
uint16_t precalculatedTransponderId = 0;
uint16_t tempTransponderId = 0;
uint32_t nextTransponderTransmitTime = 0;

uint32_t debounceEndTime = 0;

uint32_t buttonState = BTN_UP;
uint32_t lastButtonPressTime = 0; // The last time the button transitioned to BTN_DOWN
uint32_t lastButtonUpTime = 0;
uint32_t lastClickTime = 0;
uint8_t  repeatClickCount = 0;
bool waitingForLongPressToRelease = false; // true after a long press has been detected and the button is still being held down

uint8_t ledState = LOW;
uint32_t nextLEDTime = 0;

uint16_t generateRandomTransponderId(){
  uint16_t val = 0;
  for(int i = 0; i < 16; i++){
    uint8_t bit1 = analogRead(FLOATING_PIN);
    delayMicroseconds(256);
    uint8_t bit2 = analogRead(FLOATING_PIN);

    bit1 &= 0x1;
    bit2 &= 0x1;

    if(bit1 != bit2){
      val |= ((uint16_t)bit1) << i;
    }
    else{
      i--;
    }
    delayMicroseconds(256);
  }

  return val % 1000;
}

void loadTransponderId()
{
  transponderId = (EEPROM[0] << 8) | EEPROM[1];

  if(crc4(transponderId) != 0)
  {
    transponderId = generateRandomTransponderId();
    storeTransponderId();
  }
  else
  {
    precalculatedTransponderId = transponderId;
    transponderId >>= 4;
  }

  if(transponderId >= 1000)
  {
    transponderId = generateRandomTransponderId();
    storeTransponderId();
  }

#if !defined(NO_SERIAL)
  Serial.print("Loaded: ");
  Serial.println(transponderId, DEC);
#endif
}

void storeTransponderId()
{
  precalculatedTransponderId = (transponderId << 4) | (crc4(transponderId));
  
  EEPROM[0] = (uint8_t) (precalculatedTransponderId >> 8);
  EEPROM[1] = (uint8_t) (precalculatedTransponderId & 0xff);

#if !defined(NO_SERIAL)
  Serial.print("Stored: ");
  Serial.println(transponderId, DEC);
#endif
}

void setup() {
#if !defined(NO_SERIAL)
  Serial.begin(9600);
#endif

#if defined(CLEAR_EEPROM)
  EEPROM[0] = 0xff;
  EEPROM[1] = 0xff;
#endif

  loadTransponderId();
  pinMode(BUTTON_PIN, INPUT_PULLUP); 
  pinMode(LED_PIN, OUTPUT);
}

void ledOn()
{
  //digitalWriteFast(LED_PIN, HIGH);
  analogWrite(LED_PIN, LED_LEVEL);
  ledState = HIGH;
}

void ledOff()
{
  //digitalWriteFast(LED_PIN, LOW);
  analogWrite(LED_PIN, 0);
  ledState = LOW;
}

void processLED(uint32_t now)
{
  switch(operationMode)
  {
    case NORMAL_MODE:
    // In normal mode, just blink
      if(ledState == LOW)
      {
        if(now >= nextLEDTime)
        {
          ledOn();
          nextLEDTime = now + LED_ON_PERIOD;
        }
      }
      else
      {
        if(now >= nextLEDTime)
        {
          ledOff();
          nextLEDTime = now + LED_OFF_PERIOD;
        }
      }
      break;
    case PROGRAM_HUNDREDS_MODE:
    case PROGRAM_TENS_MODE:
    case PROGRAM_ONES_MODE:
    // While in program mode, keep the LED on
    // except while the button is pressed.
    // Also turn back on after a long press
    // has completed
      if(ledState == LOW)
      {
        if(buttonState == BTN_UP || waitingForLongPressToRelease)
        {
          ledOn();
        }
      }
      else
      {
        if(buttonState == BTN_DOWN && !waitingForLongPressToRelease)
        {
          ledOff();
        }
      }

      break;
  }
}

void sendTransponderID(uint32_t now)
{
  if(operationMode == NORMAL_MODE && now >= nextTransponderTransmitTime)
  {
    sendOpenLap(IR_SEND_PIN, precalculatedTransponderId, true);
    nextTransponderTransmitTime = now + random(MIN_REPEAT_DELAY, MAX_REPEAT_DELAY);
  }
}

void setRandomTransponderId(){
  transponderId = generateRandomTransponderId();
  storeTransponderId();

  for(int i = 0; i < 20; i++)
  {
    ledOn();
    delay(20);
    ledOff();
    delay(40);
  }
}

void handleButtonClick(uint32_t now)
{
  switch(operationMode)
  {
    case NORMAL_MODE:
      if(now - lastClickTime <= REPEAT_CLICK_TIME){
        repeatClickCount++;
        if(repeatClickCount >= RESET_CLICKS)
        {
          setRandomTransponderId();
          repeatClickCount = 0;
        }
      }
      else{
        repeatClickCount = 1;
      }

      lastClickTime = now;
      break;
    case PROGRAM_HUNDREDS_MODE:
      if(tempTransponderId % 1000 == 900)
      {
        tempTransponderId -= 900;
      }
      else
      {
        tempTransponderId += 100;
      }
      break;
    case PROGRAM_TENS_MODE:
      if(tempTransponderId % 100 == 90)
      {
        tempTransponderId -= 90;
      }
      else
      {
        tempTransponderId += 10;
      }
      break;
    case PROGRAM_ONES_MODE:
      if(tempTransponderId % 10 == 9)
      {
        tempTransponderId -= 9;
      }
      else
      {
        tempTransponderId += 1;
      }
      break;
  }
}

void handleButtonLongPress()
{
  switch(operationMode)
  {
    case NORMAL_MODE:
      operationMode = PROGRAM_HUNDREDS_MODE;
      tempTransponderId = 0;
      break;
    case PROGRAM_HUNDREDS_MODE:
      operationMode = PROGRAM_TENS_MODE;
      break;
    case PROGRAM_TENS_MODE:
      operationMode = PROGRAM_ONES_MODE;
      break;
    case PROGRAM_ONES_MODE:
      transponderId = tempTransponderId;
      storeTransponderId();
      operationMode = NORMAL_MODE;
      break;
  }
}

void handleButtonInactivity()
{
    if(operationMode != NORMAL_MODE)
    {
      // just go back to normal mode
      operationMode = NORMAL_MODE;
    }
}

void processButtonState(uint32_t now)
{
  if(debounceEndTime != 0 && now < debounceEndTime)
  {
    return;
  }

  uint8_t newButtonState = digitalReadFast(BUTTON_PIN);

  if(newButtonState != buttonState && debounceEndTime == 0)
  {
      debounceEndTime = now + BTN_DEBOUNCE_PERIOD;
      return;
  }
  else
  {
    debounceEndTime = 0;
  }

  if(newButtonState != buttonState)
  { 
    if(newButtonState == BTN_DOWN)
    {
      // button was pressed
      lastButtonPressTime = now;
#if !defined(NO_SERIAL)
      Serial.println("Button Down");
#endif
    }
    else
    {
#if !defined(NO_SERIAL)
      Serial.println("Button Up");
#endif

      // button was released
      waitingForLongPressToRelease = false;
      lastButtonUpTime = now;

      // only process a 'click' if this wasn't a release of a long press
      if(now - lastButtonPressTime < LONG_PRESS_TIME)
      {
#if !defined(NO_SERIAL)
        Serial.println("Button Click");
#endif
        handleButtonClick(now);
      }
    }

    buttonState = newButtonState;
  }
  else if(newButtonState == BTN_DOWN)
  {
    // button is still being held
    if(!waitingForLongPressToRelease && now - lastButtonPressTime >= LONG_PRESS_TIME)
    {
#if !defined(NO_SERIAL)
      Serial.println("Button Long Press");
#endif
      handleButtonLongPress();
      waitingForLongPressToRelease = true;
    }
  }
  else
  {
    // button hasn't been pressed in a while
    if(now - lastButtonUpTime >= BTN_INACTIVITY_TIMEOUT)
    {
      handleButtonInactivity();
    }
  }
}

void loop()
{
  uint32_t now = millis();

  processButtonState(now);
  processLED(now);
  sendTransponderID(now);
}

