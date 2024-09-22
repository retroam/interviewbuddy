'use client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
} from '@livekit/components-react';
import { useState } from "react";
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/javascript/javascript';

export default () => {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [code, setCode] = useState('// Write your code here');
  const [output, setOutput] = useState('');

  const runCode = async () => {
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const result = await response.json();
    setOutput(result.output);
  };

  return (
    <>
      <main className="main-container">
        <div className="audio-section">
          {token === null ? (
            <button className="connect-button" onClick={async () => {
              const {accessToken, url} = await fetch('/api/token').then(res => res.json());
              setToken(accessToken);
              setUrl(url);
            }}>Connect</button>
          ) : (
            <LiveKitRoom
              token={token}
              serverUrl={url}
              connectOptions={{autoSubscribe: true}}
            >
              <ActiveRoom />
            </LiveKitRoom>
          )}
        </div>
        <div className="chat-section">
          <button className="upload-button">Upload Documents</button>
        </div>
        <div className="coding-repl">
          <CodeMirror
            value={code}
            options={{
              mode: 'javascript',
              theme: 'material',
              lineNumbers: true,
            }}
            onBeforeChange={(editor, data, value) => {
              setCode(value);
            }}
          />
          <button onClick={runCode}>Run</button>
          <div className="output-section">
            <h3>Output</h3>
            <pre>{output}</pre>
          </div>
        </div>
      </main>
    </>
  );
};

const ActiveRoom = () => {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  return (
    <>
      <RoomAudioRenderer />
      <button onClick={() => {
        localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled)
      }}>Toggle Microphone</button>
      <div>Audio Enabled: { isMicrophoneEnabled ? 'Unmuted' : 'Muted' }</div>
    </>
  );
};
