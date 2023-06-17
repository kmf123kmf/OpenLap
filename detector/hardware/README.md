The detector consists of an ESP32-S3 based dev board and one or more detector boards which are daisy-chained to each other.  Together, these form the detector gate.

To keep costs low, OpenLap utilizes remote control style, 38khz modulated infrared receivers. When choosing components, I would not recommend straying from the specified Vishay TSOP38338.  Though nothing particularly special, the IR protocol in use by OpenLap was designed with this receiver's specifications in mind and has only been tested working with such.

As to the other detector components, the resistor and capacitor, it may be possible to omit these entirely in favor of simply chaining the receivers directly to each other.  I've not tested this extensively, but it works fine with a single receiver hooked up, and the TSOP38338 datasheet (https://www.vishay.com/docs/81743/tsop381.pdf) only specifies these components for low voltage situations.  

Future:  
It may be worth investigating using IrDA instead of a remote control style protocol. This is much faster and has many advantages. Excellent work has already been done on this elsewhere (see https://github.com/zelogik/RicinoNext).  The main trade-off is cost. As of June 2023, a TSOP38338 is $0.38 on Digikey while the TFDU4101-TT3 IrDA transceiver module is $5.62. Parts availability and pricing will obviously vary by region, but this can add up quickly if building a larger gate.  Also, IrDA receivers are all surface mount devices which adds some complexity to the assembly process.
