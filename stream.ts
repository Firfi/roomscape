// https://stackoverflow.com/questions/66665892/how-to-stream-audio-via-youtube-dl-rather-than-downloading-to-play-audio-to-my-d
// todo ffmpeg concat demuxer
import play from 'play-dl';
import { createNamedPipe } from '@kldzj/named-pipes';
import { spawn } from 'child_process';

const URLS = ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=ZJv4rBT6Nl8'];

const webmFormatCode = 251;

let urlCache = new Map<string, string>();
const fetchUrls = async (): Promise<string[]> => {
  if (urlCache.size > 0) return Promise.resolve(URLS.map(u => urlCache.get(u)!));
  const urls = await Promise.all(URLS.map(async (url) => {
    const urlProcess = spawn('youtube-dl', ['-g', `-f${webmFormatCode}`, url], { stdio: ['ignore', 'pipe', 'pipe'] });
    return new Promise<string>((resolve, reject) => {
      urlProcess.stdout.on('data', data => {
        console.log("DATA", data.toString());
        resolve(data.toString());
      });
      urlProcess.stderr.on('data', data => reject(data.toString()));
    })
  }))
  urlCache = new Map(URLS.map((u, i) => [u, urls[i]]));
  return urls;
}

// export const init = async () => {
//   const streams = await Promise.all([play.stream('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), play.stream('https://www.youtube.com/watch?v=ZJv4rBT6Nl8')]);
//   const pipes = await Promise.all(streams.map(async (stream) => {
//     const pipe = createNamedPipe();
//     const sender = await pipe.createSender().connect();
//     stream.stream.on('data', data => sender.write(data));
//     // stream.stream.on('end', () => pipe.destroy());
//     return pipe;
//   }));
//   const child = spawn('ffmpeg', ['-i', pipes[0].path, '-i', pipes[1].path, '-filter_complex', 'amix=inputs=2:duration=longest', '-c:a', 'libfdk_aac', 'test.aac'], { stdio: ['ignore', 'pipe', 'pipe'] });
//   child.stderr.on('data', data => console.log(data.toString()));
//   child.stdout.on('data', data => console.log(data.toString()));
// }

const secondsToFfmpegString = (n: number) => {
  const normalized = Math.round(n);
  return new Date(normalized * 1000).toISOString().substr(11, 8).split('-').join(':');
}

export const init = async (start: number = 0) => {
  // ffmpeg -i $(youtube-dl -g https://www.youtube.com/watch\?v\=dQw4w9WgXcQ -f251) -c:a copy -f ogg -
  const urls = await fetchUrls();
  const args = ['-ss', secondsToFfmpegString(start), ...urls.flatMap(url => ['-i', url]), '-filter_complex', `amix=inputs=${urls.length}:duration=longest`,  '-f', 'ogg', '-'];
  console.log("args", args);
  const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  return {stream: child.stdout, destroy: () => {
    child.kill('SIGKILL');
  }};
};