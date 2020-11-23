// set up basic variables for app
const record = document.querySelector('.record');
const stop = document.querySelector('.stop');
const soundClips = document.querySelector('.sound-clips');
const amplitudeCanvas = document.querySelector('.visualizer');
const mainSection = document.querySelector('.main-controls');
let audioCtx;
const amplitudeCanvasCtx = amplitudeCanvas.getContext("2d");


const audioInputSelect = document.querySelector('select#audioSource');
const selectors = [audioInputSelect];

function gotDevices(deviceInfos) {
  // Handles being called several times to update labels. Preserve values.
  const values = selectors.map(select => select.value);
  selectors.forEach(select => {
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
  });
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'audioinput') {
      option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
      audioInputSelect.appendChild(option);
    }
  }
  selectors.forEach((select, selectorIndex) => {
    if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
      select.value = values[selectorIndex];
    }
  });
}

function visualize(stream) {
  if(!audioCtx) {
    audioCtx = new AudioContext();
  }

  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  let feedForward = [1, 4, 6, 4, 1];
  let feedBack = [1, -3.89515962872624, 5.69093969755989, -3.69623536934508,0.900457760845518];
  const iirfilter = audioCtx.createIIRFilter(feedforward=feedForward, feedback=feedBack);
  var gainNode = audioCtx.createGain();
  gainNode.gain.value = 1E-05;
  var max_amplification = 5E-04;

  analyser.fftSize = 2048;
  let amplitudeBufferLength = analyser.fftSize;
  let frequencyBufferLength = analyser.frequencyBinCount;
  let amplitudeData = new Uint8Array(amplitudeBufferLength);
  let frequencyData = new Uint8Array(frequencyBufferLength);

  
  amplitudeCanvas.style.width = '100%';
  amplitudeCanvas.width  = amplitudeCanvas.offsetWidth;
  const amplitudeCanvasCtx = amplitudeCanvas.getContext('2d');
  
  const GRAPH_WINDOW_LENGTH = 120000;
  let graphWindowData = new Uint8Array(GRAPH_WINDOW_LENGTH);
  let graphWindowStart = 0;

  // source.connect(analyser);

  source.connect(iirfilter);
  iirfilter.connect(gainNode);
  gainNode.connect(analyser);
  draw();

  function draw() {
    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(amplitudeData);
    
    const offset = GRAPH_WINDOW_LENGTH - graphWindowStart;
    graphWindowData.set(amplitudeData.slice(0, offset), graphWindowStart);
    graphWindowData.set(amplitudeData.slice(offset), 0);
    graphWindowStart = (graphWindowStart + amplitudeBufferLength) % GRAPH_WINDOW_LENGTH;

    drawAmplitudeGraph();
    // drawFrequencyGraph();
    max_amplitude = Math.max.apply(Math, amplitudeData);
    document.getElementById('volume').addEventListener('change', function() {
        max_amplification = this.value;
    });
    auto_gain = max_amplification/max_amplitude;
    gainNode.gain.value = auto_gain;

  }

  function drawAmplitudeGraph() {
    amplitudeCanvasCtx.fillStyle = 'rgb(0, 0, 0)';
    amplitudeCanvasCtx.fillRect(0, 0, amplitudeCanvas.width, amplitudeCanvas.height);

    amplitudeCanvasCtx.lineWidth = 2;
    amplitudeCanvasCtx.strokeStyle = 'rgb(0, 255, 0)';
    amplitudeCanvasCtx.beginPath();

    const sliceWidth = amplitudeCanvas.width * 1.0 / GRAPH_WINDOW_LENGTH;
    let x = 0;
    for(let i = 0; i < GRAPH_WINDOW_LENGTH; i++) {
      const v = graphWindowData[(i + graphWindowStart) % GRAPH_WINDOW_LENGTH] / 128.0;
      const y = v * amplitudeCanvas.height/2;

      if(i === 0) {
        amplitudeCanvasCtx.moveTo(x, y);
      } else {
        amplitudeCanvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    amplitudeCanvasCtx.lineTo(amplitudeCanvas.width, amplitudeCanvas.height/2);
    amplitudeCanvasCtx.stroke();
  }
}

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  
  rec = new MediaRecorder(stream);
  visualize(stream);
  rec.ondataavailable = e => {
    audioChunks.push(e.data);
    if (rec.state == "inactive"){
      let blob = new Blob(audioChunks,{'type':'audio/ogg; codecs=opus'});
      recordedAudio.src = URL.createObjectURL(blob);
      recordedAudio.controls=true;
      recordedAudio.autoplay=true;
      audioDownload.href = recordedAudio.src;
      audioDownload.download = 'myrecording.ogg';
      audioDownload.innerHTML = 'download';
    }
  }
}

function handleError(error) {
  console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

function start() {
  // Second call to getUserMedia() with changed device may cause error, so we need to release stream before changing device
  if (window.stream) {
    stream.getAudioTracks()[0].stop();
  }

  const audioSource = audioInputSelect.value;
  
  const constraints = {
    audio: {deviceId: audioSource ? {exact: audioSource} : undefined}
  };
  
  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(handleError);
}

audioInputSelect.onchange = start;
  
startRecord.onclick = e => {
  startRecord.disabled = true;
  stopRecord.disabled=false;
  audioChunks = [];
  rec.start();
}
stopRecord.onclick = e => {
  startRecord.disabled = false;
  stopRecord.disabled=true;
  rec.stop();
}

navigator.mediaDevices.enumerateDevices()
.then(gotDevices)
.then(start)
.catch(handleError);




