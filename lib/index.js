// ****************************************************************************
// smartpad - module to interface with the MiDiPLUS SmartPAD
//
// Copyright (c) 2019 Douglas Yoon - All Rights Reserved
//   You may use, distribute, and modify this code under the terms of the
//   MIT license. You should have received a copy of the license with this file
// ****************************************************************************

const spColors = {
  "red"    : 0x61,
  "green"  : 0x51,
  "blue"   : 0x41,
  "ltblue" : 0x21,
  "purple" : 0x31,
  "yellow" : 0x11,
  "white"  : 0x01,
  "off"    : 0x00
};

const shcmd = require('child_process').exec;
const fs = require('fs');
const events = require('events');
const spPktDelay = 3;

let fsOutStream;
let fsInStream;
let fsWriteBuffer = new Buffer.alloc(3);
let evtGenerator = new events.EventEmitter();

let noWait = true;
let buttonColor = spColors.white;
let spClipButtonList = [];
let spMode1ButtonList = [];
let spMode2ButtonList = [];
var lastPktWriteTime=0;
var spAutoButtonLight=false;


// ****************************************************************************
// utlity: initialize the lookup tables
// ****************************************************************************
function spInitButtonArrays() {
  for (let i=0; i<8; i++) {
    for (let j=0; j<8; j++) {
      spClipButtonList[((i<<4)+j)] = {id:(i*8)+j};
    }
  }

  spMode1ButtonList = [
    -1,-1,-1,-1,-1,-1,-1,-1,  // 0-7
    -1,-1,-1,-1,-1,-1,-1,-1,  // 8-15
    -1,-1,-1,-1,-1,-1,-1,-1,  // 16-23
    -1,-1,-1,-1,-1,-1,-1,-1,  // 24-31
    -1,-1,-1,-1,56,57,58,59,  // 32-39
    48,49,50,51,40,41,42,43,  // 40-47
    32,33,34,35,24,25,26,27,  // 48-55
    16,17,18,19,08,09,10,11,  // 56-63
    00,01,02,03,60,61,62,63,  // 64-71
    52,53,54,55,44,45,46,47,  // 72-79
    36,37,38,39,28,29,30,31,  // 80-87
    20,21,22,23,12,13,14,15,  // 88-95
    04,05,06,07,-1,-1,-1,-1,  // 96-103
  ];
}


// ****************************************************************************
// API: function to teardown this module
// ****************************************************************************
function spClose() {
  fsOutStream.close();
  fsInStream.close();
  fsInStream.push(null);
  fsInStream.read(0);
}


// ****************************************************************************
// API: function to initialize this module; 
//   callback when ready
//   emit an event
// ****************************************************************************
function spInitSmartPadDevice(cbFunc) {
  executeCmd = shcmd('cat /proc/asound/cards | grep SmartPAD', (error, stdout, stderror) => {
    let x = parseInt(stdout.substring(0,3));

    if (isNaN(x)) {
      console.log("ERROR: Did not find the MiDiPLUS SmartPad device");
      console.log("       Please check that SmartPad is plugged in");
    } else {
      fsOutStream = fs.createWriteStream("/dev/midi"+x);
      fsInStream = fs.createReadStream("/dev/midi"+x);

      fsInStream.on ('data',  spReadTrigger);
      fsOutStream.on('drain', spDrainTrigger);

      spInitButtonArrays();

      cbFunc(evtGenerator);
      evtGenerator.emit('ready');
    }
  });

  return(evtGenerator);
}


// ****************************************************************************
// utility: translate button number (0-63) to MIDI code
//   the MIDI code is actually the index, so the lookup is on the button value
//   data stuffed backwards to facilitate callbacks for each button
// ****************************************************************************
function spFindButtonId(bNum) {
  let retVal = spClipButtonList.findIndex ((x) => {
    if (x === undefined) {
      return false;
    } else {
      return(x.id == bNum);
    }
  });
  return (retVal);
}


// ****************************************************************************
// utility: function to actually write out the packet; capture throttle
// ****************************************************************************
function spWriteData(pktData) {
  fsWriteBuffer[0] = pktData[0];
  fsWriteBuffer[1] = pktData[1];
  fsWriteBuffer[2] = pktData[2];

//console.log("sending....",fsWriteBuffer);
  if (noWait) {
    noWait = fsOutStream.write(fsWriteBuffer);
  }
}


// ****************************************************************************
// utility: function to schedule next packet; need to throttle, since
//   MiDiPLUS SmartPAD cannot handle rapid fire packets
// ****************************************************************************
function spSendPkt(pktData) {
  let now = Date.now();

  if (lastPktWriteTime < now){
//console.log("send now");
    lastPktWriteTime = now+spPktDelay;
    setTimeout(spWriteData,1,pktData);
  } else {
    lastPktWriteTime += spPktDelay;
    setTimeout(spWriteData,lastPktWriteTime-now,pktData);
//console.log("send", lastPktWriteTime-now);
  }

}


// ****************************************************************************
// API: function to light one of the 64 buttons main buttons
//   needed 2 buffers which are used in context in lower level functions
// ****************************************************************************
function spLightButton(bNum, bColor) {
//console.log(bNum,spFindButtonId(bNum).toString(16),bColor);
  let bufOff = [];
  let bufOn = [];
  let button = spFindButtonId(bNum);

  // explicitly turn off button, to get the right color
  bufOff[0] = 0x80;
  bufOff[1] = button;
  bufOff[2] = bColor;
  spSendPkt(bufOff);

  // if we are lighting the button, do it here
  if (bColor != 0) {
    bufOn[0] = 0x90;
    bufOn[1] = button;
    bufOn[2] = bColor;
    spSendPkt(bufOn);
  }
}


// ****************************************************************************
// API: function to set the knob value; useful to create a continuous rotary
// ****************************************************************************
function spSetKnob(kNum, kValue) {
  let buf = [];
  buf[0] = 0xb0;
  buf[1] = kNum;
  buf[2] = kValue;
  spSendPkt(buf);
}


// ****************************************************************************
// API: function to enable lighting the button from here
// ****************************************************************************
function spEnableAutoLight() {
  spAutoButtonLight=true;
}


// ****************************************************************************
// event handler: throttle, when write are overwhelming the port;
//   In theory, this should never be called, since MIDI is so slow
// ****************************************************************************
function spDrainTrigger(chunk) {
//console.log("drain trigger", chunk);
  noWait = true;
}


// ****************************************************************************
// event handler: when someone presses a button or turns a knob
//   Knob:
//     chunk[0] is the knob flag {knob:0xb0}
//     chunk[1] is the knob ID
//     chunk[2] is the knob Value
//   Button:
//     chunk[0] is button state {down:0x90, up:0x80}
//     chunk[1] is the MIDI code for the button
//     chunk[2] is the velocity value
// ****************************************************************************
function spReadTrigger(chunk) {
//console.log("==>", chunk);
  for (i=0; i<Math.trunc(chunk.length/3); i++) {
    if (chunk[(i*3)] == 0xb0) {
//console.log("knob");
        evtGenerator.emit('knobChange', chunk[(i*3)+1], chunk[(i*3)+2]);
    } else {
//console.log("button");
      if (chunk[(i*3)] == 0x90) {
        if (spAutoButtonLight) {
          spLightButton(spClipButtonList[chunk[(i*3)+1]].id, spColors.white);
        }
        evtGenerator.emit('buttonDown', spClipButtonList[chunk[(i*3)+1]].id);
      } else {
        if (spAutoButtonLight) {
          spLightButton(spClipButtonList[chunk[(i*3)+1]].id, spColors.off);
        }
        evtGenerator.emit('buttonUp', spClipButtonList[chunk[(i*3)+1]].id);
      }
    }
  }
}


exports.initSmartPadDevice = spInitSmartPadDevice;
exports.lightButton = spLightButton;
exports.setKnob = spSetKnob;
exports.color = spColors;
exports.enableAutoLight = spEnableAutoLight;
exports.stop = spClose;
