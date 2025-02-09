let detector; //made the model global to save resources

//global varibales stroing elements from HTML
const videoElement = document.getElementById("webcam");
const refButton = document.getElementById("ref");

const distanceBool = document.querySelector("#distanceBool");
const slouchingBool = document.querySelector("#slouchingBool");
const notificationBool = document.querySelector("#notificationBool");
const soundBool = document.querySelector("#soundBool");

const eyeSlider = document.querySelector("#eyeSlider");
const eyeValue = document.querySelector("#eyeValue");
const shoulderSlider = document.querySelector("#shoulderSlider");
const shoulderValue = document.querySelector("#shoulderValue");
const eyeAlertTimeSlider = document.querySelector("#eyeAlertTimeSlider");
const eyeAlertTimeValue = document.querySelector("#eyeAlertTimeValue");
const shoulderAlertTimeSlider = document.querySelector(
  "#shoulderAlertTimeSlider"
);
const shoulderAlertTimeValue = document.querySelector(
  "#shoulderAlertTimeValue"
);

//thresholds
let eye_distance_threshold = 25;
let shoulder_distance_threshold = 15;
let eye_alert_threshold = 2;
let eye_correct_threshold = 5;
let shoulder_alert_threshold = 2;
let shoulder_correct_threshold = 5;

//global variables storing references
let reference_left_eye;
let reference_right_eye;
let reference_left_shoulder;
let reference_right_shoulder;
let reference_eye_distance;
let reference_shoulder_height;

//global counters
let eye_counter = 0;
let shoulder_counter = 0;
let eye_correct_counter = 0;
let shoulder_correct_counter = 0;

// global boolean  to select what features to use
let distance_detection = true;
let slouching_detection = true;
let system_notifications = true;
let sound_notifications = true;

//Updates the HTML input elements to match the default threshold values.
async function changeDefaults() {
  eyeSlider.value = eye_distance_threshold;
  eyeValue.innerText = eye_distance_threshold;

  shoulderSlider.value = shoulder_distance_threshold;
  shoulderValue.innerText = shoulder_distance_threshold;

  eyeAlertTimeSlider.value = eye_alert_threshold;
  eyeAlertTimeValue.innerText = eye_alert_threshold;

  shoulderAlertTimeSlider.value = shoulder_alert_threshold;
  shoulderAlertTimeValue.innerText = shoulder_alert_threshold;

  distanceBool.checked = distance_detection;
  slouchingBool.checked = slouching_detection;
  notificationBool.checked = system_notifications;
  soundBool.checked = sound_notifications;
}

//Connects HTML input elements to event listeners to update global variables dynamically.
async function connectHtml() {
  distanceBool.addEventListener("change", () => {
    distance_detection = distanceBool.checked;
  });
  slouchingBool.addEventListener("change", () => {
    slouching_detection = slouchingBool.checked;
  });
  notificationBool.addEventListener("change", () => {
    system_notifications = notificationBool.checked;
  });
  soundBool.addEventListener("change", () => {
    sound_notifications = soundBool.checked;
  });
  eyeSlider.addEventListener("input", () => {
    eye_distance_threshold = eyeSlider.value;
  });
  shoulderSlider.addEventListener("input", () => {
    shoulder_distance_threshold = shoulderSlider.value;
  });
  eyeAlertTimeSlider.addEventListener("input", () => {
    eye_alert_threshold = eyeAlertTimeSlider.value;
  });
  shoulderAlertTimeSlider.addEventListener("input", () => {
    shoulder_alert_threshold = shoulderAlertTimeSlider.value;
  });
}

//Creates the MoveNet pose detection model and assigns it to the global `detector` variable
async function createModel() {
  const model = poseDetection.SupportedModels.MoveNet;
  detector = await poseDetection.createDetector(model);
}
//Requests notification permissions from the browser
async function requestNotificationPermissions() {
  let permission = await Notification.requestPermission();
  if (permission != "granted") {
    alert("Notifications are important for functionality. Please enable them.");
  }
}
//Starts the webcam
async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
  } catch (error) {
    console.error("Error accessing webcam:", error);
  }
}

//calls another function that takes reference data
async function startReference() {
  return new Promise((resolve) => {
    refButton.addEventListener("click", async () => {
      await takereference();
      resolve();
    });
  });
}
//Captures the reference data
async function takereference() {
  let poses;
  do {
    poses = await detector.estimatePoses(videoElement);
  } while (!checkData(poses));
  refButton.innerText = "Re-Take Reference Image"
  reference_left_eye = poses[0].keypoints[1];
  reference_right_eye = poses[0].keypoints[2];
  reference_left_shoulder = poses[0].keypoints[5];
  reference_right_shoulder = poses[0].keypoints[6];
  reference_eye_distance = distance(reference_left_eye, reference_right_eye);
  reference_shoulder_height = average(
    reference_left_shoulder,
    reference_right_shoulder
  );
}
//starts posture detection
function startDetection() {
  setInterval(detect, 1000);
}
//does the actuall detection work
async function detect() {
  const poses = await detector.estimatePoses(videoElement);
  // console.log(poses)
  if (checkData(poses)) {
    let keypoints = poses[0].keypoints;
    let nose = keypoints[0];
    let left_eye = keypoints[1];
    let right_eye = keypoints[2];
    let left_shoulder = keypoints[5];
    let right_shoulder = keypoints[6];
    if (distance_detection) {
      let eye_distance = distance(left_eye, right_eye);
      if (eye_counter >= eye_alert_threshold) {
        sendCloseNotification();
        eye_counter = 0;
        eye_correct_counter = 0;
      } else {
        if (eye_distance > reference_eye_distance + eye_distance_threshold) {
          eye_counter++;
        } else {
          eye_correct_counter++;
          if (eye_correct_counter > eye_correct_threshold) {
            eye_counter = 0;
            eye_correct_counter = 0;
          }
        }
      }
    }
    if (slouching_detection) {
      let shoulder_height = average(left_shoulder, right_shoulder);
      if (shoulder_counter >= shoulder_alert_threshold) {
        sendSlouchingNotification();
        shoulder_counter = 0;
        shoulder_correct_counter = 0;
      } else {
        if (
          shoulder_height >
          reference_shoulder_height + shoulder_distance_threshold
        ) {
          shoulder_counter++;
        } else {
          shoulder_correct_counter++;
          if (shoulder_correct_counter > shoulder_correct_threshold) {
            shoulder_counter = 0;
            shoulder_correct_counter = 0;
          }
        }
      }
    }
  }
}
//sends notification for distance
function sendCloseNotification() {
  if (system_notifications) {
    let notification = new Notification("Posture Alert: Too Close!", {
      body: "You are sitting too close to the screen. Please move back.",
    });
    setTimeout(() => {
      notification.close();
    }, 3000);
  }
  if (sound_notifications) {
    new Audio("./too_close.mp3").play();
  }
}
//sends notification for slouching
function sendSlouchingNotification() {
  if (system_notifications) {
    let notification = new Notification("Posture Alert: Slouching!", {
      body: "You are slouching. Sit up straight for better posture.",
    });
    setTimeout(() => {
      notification.close();
    }, 3000);
  }
  if (sound_notifications) {
    new Audio("./slouching.mp3").play();
  }
}
//checks wether the posture data is valid or not
function checkData(poses) {
  if (poses.length > 0) {
    let c2 = poses[0].score > 0.35;
    let c3 =
      poses[0].keypoints[1].score > 0.4 && poses[0].keypoints[2].score > 0.4;
    let c4 =
      poses[0].keypoints[5].score > 0.3 && poses[0].keypoints[6].score > 0.3;
    if (c2 && c3 && c4) {
      return true;
    }
  }
  return false;
}
//calculates the euclidean distance
function distance(object1, object2) {
  return Math.sqrt((object2.x - object1.x) ** 2 + (object2.y - object1.y) ** 2);
}
//calculates the average
function average(obj1, obj2) {
  return (obj1.y + obj2.y) / 2;
}
//does the job
async function main() {
  await changeDefaults();
  await connectHtml();
  await createModel();
  await requestNotificationPermissions();
  await startWebcam();
  await startReference();
  startDetection();
}

main();
