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

function gotStream(stream) {
  window.stream = stream; // make stream available to console

  rec = new MediaRecorder(stream);
  rec.ondataavailable = e => {
    audioChunks.push(e.data);
    if (rec.state == "inactive") {
      let blob = new Blob(audioChunks, {
        type: 'audio/x-mpeg-3'
      });
      recordedAudio.src = URL.createObjectURL(blob);
      recordedAudio.controls = true;
      recordedAudio.autoplay = true;
      audioDownload.href = recordedAudio.src;
      audioDownload.download = 'mp3';
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
    audio: {
      deviceId: audioSource ? {
        exact: audioSource
      } : undefined
    }
  };

  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(handleError);
}

audioInputSelect.onchange = start;

startRecord.onclick = e => {
  startRecord.disabled = true;
  stopRecord.disabled = false;
  audioChunks = [];
  rec.start();
}
stopRecord.onclick = e => {
  startRecord.disabled = false;
  stopRecord.disabled = true;
  rec.stop();
}

navigator.mediaDevices.enumerateDevices()
  .then(gotDevices)
  .then(start)
  .catch(handleError);
