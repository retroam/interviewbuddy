'use client';

import { useState } from "react";
import {
  BarVisualizer,
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  VoiceAssistantControlBar,
} from '@livekit/components-react';
import "@livekit/components-styles";

export default function InterviewBuddy() {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const handleConnect = async () => {
    const { accessToken, url } = await fetch('/api/token').then(res => res.json());
    setToken(accessToken);
    setUrl(url);
  };

  return (
    <div className="interview-buddy">
      {token === null ? (
        <div className="welcome-screen">
          <h1>Interview Buddy</h1>
          <div className="options">
            <select>
              <option>EASY</option>
              <option selected>MEDIUM</option>
              <option>HARD</option>
            </select>
            <button onClick={handleConnect}>Connect</button>
          </div>
        </div>
      ) : (
        <LiveKitRoom
          token={token}
          serverUrl={url}
          connectOptions={{ autoSubscribe: true }}
          data-lk-theme="default"
          className="livekit-room"
        >
          <div className="interview-container">
            <div className="video-section">
              <SimpleVoiceAssistant />
              <VoiceAssistantControlBar />
              <RoomAudioRenderer />
            </div>
            <div className="coding-section">
              <h3>Coding Challenge</h3>
              {/* Add coding challenge content here */}
              <button>Submit Solution</button>
              <div className="output-section">
                <h4>Output:</h4>
                <pre>{/* Add output content here */}</pre>
              </div>
            </div>
          </div>
        </LiveKitRoom>
      )}
      <style jsx global>{`
        body {
          background-color: #ffffff;
          color: #333333;
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
        }
        .interview-buddy {
          display: flex;
          flex-direction: column;
          height: 100vh;
          padding: 20px;
        }
        .welcome-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .welcome-screen h1 {
          font-size: 2em;
          margin-bottom: 20px;
          color: #008000;
        }
        .options {
          display: flex;
          gap: 10px;
        }
        .options button,
        .options select {
          background-color: #ffffff;
          color: #008000;
          border: 2px solid #008000;
          padding: 10px;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .options button:hover,
        .options select:hover {
          background-color: #008000;
          color: #ffffff;
        }
        .livekit-room {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .interview-container {
          display: flex;
          flex: 1;
        }
        .video-section {
          flex: 1;
          background-color: #f0f0f0;
          padding: 20px;
          border-radius: 10px;
        }
        .coding-section {
          width: 50%;
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
          padding: 20px;
          overflow-y: auto;
          border-left: 2px solid #008000;
        }
        .coding-section h3 {
          color: #008000;
        }
        .coding-section button {
          background-color: #008000;
          color: #ffffff;
          border: none;
          padding: 10px;
          margin-top: 10px;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        .coding-section button:hover {
          background-color: #006400;
        }
        .output-section {
          background-color: #f0f0f0;
          padding: 10px;
          margin-top: 10px;
          border-radius: 5px;
        }
        .output-section h4 {
          margin: 0 0 10px 0;
          color: #008000;
        }
        .output-section pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #333333;
        }
      `}</style>
    </div>
  );
}

const SimpleVoiceAssistant = () => {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <BarVisualizer
      state={state}
      barCount={7}
      trackRef={audioTrack}
      style={{ height: '300px' }}
    />
  );
};