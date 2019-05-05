const mpsp = require("..");

var intervalHandle;
var mspsEvts;
var testState=0;

// ****************************************************************************
// Testing State Machine
//   test lighting the buttons
//   test button up/down
//   test knobs
// ****************************************************************************
function testStateMachine() {

  switch (testState) {
    case 0:  // light the buttons
      console.log("LIGHTING ALL THE BUTTONS");
      for (let i=0; i<64; i++) {
        mpsp.lightButton(i,mpsp.color.blue);
      }

      for (let i=0; i<64; i++) {
        mpsp.lightButton(i,mpsp.color.off);
      }

      testState++;
      break;
    case 1:
      console.log("PLEASE PRESS A BUTTON");
      break;
    case 2:
      console.log("PLEASE TURN A KNOB");
      break;
    default:
      console.log("****** TESTING COMPLETE ******");
      console.log("PLEASE PRESS ANOTHER BUTTON TO QUIT");
      clearInterval(intervalHandle);
      mpsp.stop();
      process.exit();
      break;
  }

}


// ****************************************************************************
// event handler: Button Down
// ****************************************************************************
function DButtonHander(button) {
  console.log("Button Down EvtHandler", button);
  mpsp.lightButton(button,mpsp.color.purple);
}


// ****************************************************************************
// event handler: Button Up
// ****************************************************************************
function UButtonHander(button) {
  console.log("Button Up EvtHandler", button);
  mpsp.lightButton(button,mpsp.color.off);
  testState++;
}


// ****************************************************************************
// event handler: knob turns
// ****************************************************************************
function DeltaKnob (kID, Value) {
  console.log("Knob: "+kID, Value);
  testState++;
}


mspsEvts = mpsp.initSmartPadDevice(() => {
  intervalHandle = setInterval(testStateMachine,2000);
});

mspsEvts.on('buttonDown',DButtonHander);
mspsEvts.on('buttonUp',UButtonHander);
mspsEvts.on('knobChange',DeltaKnob);

