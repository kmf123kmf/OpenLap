The transponder can be built on a protoboard using fairly common components.

1 x Microchip Technology ATTINY85-20PU - microcontroller  
1 x Microchip Technology MCP1702-5002E/TO - 5V linear regulator  
1 x Lumex OED-EL-1L2 - 5mm 940nm IR LED  
1 x Generic Red LED  
1 x BC337 - NPN BJT  
1 x 100R resistor  
1 x 1K resistor  
1 x 470R resistor  
2 x 2.2uf electrolytic or ceramic capacitor

A DIP8 socket is recommended to allow for off-board programming of the ATtiny85.  You'll also need a servo wire to provide ground and power.
A PCB layout which approximates a 2.54m spacing protoboard is included for reference.   

The software can make use of a tactile switch between pin 7 and ground, but due to size contraints, this is not present in the through hole PCB design.  The easiest way around this is to use a DIP socket on the transponder PCB and simply move the chip to a breadboard setup which has the switch installed.

Future:  
Significant space savings can be achieved by using surface mount components.  
