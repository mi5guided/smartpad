# smartpad
A module to help tinkerers use the MiDiPLUS SmartPAD for their own projects.\
This module only supports Linux and has only been tested on Ubuntu 18.04 with node 10.13.0.

This module works best in the **Clip** and **Set** modes. **Mode 1** and **Mode 2** are not supported, at this time.

## Install
Using npm:

```console
$ npm install smartpad
```

## Usage
To use the module, a MiDiPLUS SmartPAD must be connected to the device.

Buttons are number 0-63, where button 0 is upper-left and button 63 is lower-right.\
Row 1 is buttons 0-7\
Row 2 is buttons 8-15\
etc...

Knob are identified 0-7 and values are 0-127

``` js
const smartpad = require('smartpad');

var smartpadEvts = smartpad.initSmartPadDevice((evtEmitter) => {
  smartpadEvts = evtEmitter;
  smartpadEvts.on('buttonDown', (button) => {
    console.log("Button Down EvtHandler", button);
    smartpad.lightButton(button, smartpad.color.purple);
  });

  smartpadEvts.on('buttonUp', (button) => {
    console.log("Button Down EvtHandler", button);
    smartpad.lightButton(button, smartpad.color.off);
  });

  smartpadEvts.on('knobChange', (kID, Value) => {
    console.log("Knob: "+kID, Value);
  });

  smartpad.lightButton(27, smartpad.color.purple);
});

```

## Constants
```
smartpad.color.red
smartpad.color.green
smartpad.color.blue
smartpad.color.ltblue
smartpad.color.purple
smartpad.color.yellow
smartpad.color.white
smartpad.color.off`
```

## API
`smartpad.initSmartPadDevice(callback)`\
&nbsp; &nbsp;find and open the SmartPAD device (requires ALSA to create /dev/midi1)\
&nbsp; &nbsp;returns an event generator\
`smartpad.lightButton(buttonNumber, color)`\
&nbsp; &nbsp;light a button with a certain color (or turn it off)\
&nbsp; &nbsp;returns nothing\
`smartpad.setKnob(knobNumber, knobValue)`\
&nbsp; &nbsp;Knobs retain their own value inside the device. You can reset it with this call.\
&nbsp; &nbsp;returns nothing\
`smartpad.stop()`\
&nbsp; &nbsp;clean up and tear down this module, so you can exit\
&nbsp; &nbsp;returns nothing

## Events
`ready`: when initialization is complete\
`buttonDown`: when a button is pressed, passes in the button number (0-63)\
`buttonUp`: when a button is released, passes in the button number (0-63)\
`knobChange`: when a knob is turned, passes in the knob number and value of knob (0-127)

## Meta
[LICENSE (MIT)](./LICENSE)
