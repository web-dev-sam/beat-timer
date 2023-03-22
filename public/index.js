// app.js
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
  log: true,
});

document.getElementById('fileInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  trimAudio(file);
});

async function trimAudio(file) {
  await ffmpeg.load();

  const name = file.name;
  const trimmedName = 'trimmed_' + name;
  const dataArray = await fetchFile(file);

  ffmpeg.FS('writeFile', name, dataArray);

  const trimStart = 10; // 1 second
  const trimEnd = 1; // 1 second

  const duration = await getDuration(dataArray);
  const formattedDuration = formatDuration(duration);
  const trimDuration = duration - trimStart - trimEnd;
  const formattedTrimDuration = formatDuration(trimDuration);
  console.log('Trimming audio...');
  console.log('Name:', name);
  console.log('Duration:', duration);
  console.log('Formatted duration:', formattedDuration);
  console.log('Trim start:', trimStart);
  console.log('Trim end:', trimEnd);
  console.log('Trim duration:', trimDuration);
  console.log('Formatted Trim duration:', formattedTrimDuration);
  console.log('Trimmed name:', trimmedName);

  await ffmpeg.run(
    '-i', name,
    '-ss', formatDuration(trimStart),
    '-t', formattedDuration,
    '-c',
    'copy', trimmedName
  );

  const trimmedData = ffmpeg.FS('readFile', trimmedName);
  createDownloadLink(trimmedData, trimmedName);
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = remainingSeconds.toFixed(3).padStart(6, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

function getDuration(dataArray) {
  console.log('Getting duration...');
  return new Promise((resolve, reject) => {
    const hiddenAudio = document.getElementById('hiddenAudio');
    const blob = new Blob([dataArray.buffer], { type: 'audio/wav' });
    const objectUrl = URL.createObjectURL(blob);
    hiddenAudio.src = objectUrl;

    hiddenAudio.addEventListener('loadedmetadata', () => {
      const duration = hiddenAudio.duration;
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    });

    hiddenAudio.addEventListener('error', () => {
      reject(new Error('Could not load the audio file.'));
    });
  });
}

function createDownloadLink(data, filename) {
  const blob = new Blob([data.buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.getElementById('downloadLink');
  downloadLink.href = url;
  downloadLink.download = filename;
  downloadLink.style.display = 'block';
}