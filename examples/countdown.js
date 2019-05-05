//const mpsp = require("smartpad");
const mpsp = require("..");
const millis = 1000

var zeroPoint = Date.now()+80000;
var buttonOn = true;
var counterObj;
var mspsEvts;

function countdown() {
  let timeLeft = zeroPoint - Date.now();
  let color = mpsp.color.purple;

  if ((timeLeft/millis) > 50) {
    color = mpsp.color.green;
  } else if ((timeLeft/millis) > 20) {
    color = mpsp.color.yellow;
  } else {
    color = mpsp.color.red;
    mpsp.lightButton(27,mpsp.color.purple);
  }

  if ((buttonOn) && (color != mpsp.color.green)){
    color = mpsp.color.off;
  }
  buttonOn = !buttonOn;

  for (let i=0; i<8; i++) {
    if ((timeLeft/millis) > (i*10)) {
      mpsp.lightButton(i,color);
    } else {
      mpsp.lightButton(i,mpsp.color.off);
    }
  }

  if (timeLeft < 0) {
    clearInterval(counterObj);
  }
}

function DButtonHander(button) {
//  console.log("Button Down EvtHandler", button);
  mpsp.lightButton(63,mpsp.color.purple);
}

function UButtonHander(button) {
//  console.log("Button Up EvtHandler", button);
  mpsp.lightButton(63,mpsp.color.green);
}

function DeltaKnob (kID, Value) {
  console.log("Knob: "+kID, Value);
  if (Value == 127) {
    mpsp.setKnob(kID,0);
  }

  if (Value == 0) {
    mpsp.setKnob(kID,127);
  }
}


mspsEvts = mpsp.initSmartPadDevice((evtEmitter) => {
  mspsEvts = evtEmitter;
  counterObj = setInterval(countdown,500);
  console.log("Callback READY!!!");
});

mspsEvts.on('buttonDown',DButtonHander);
mspsEvts.on('buttonUp',UButtonHander);
mspsEvts.on('knobChange',DeltaKnob);
console.log(mpsp);
