'use client';
import dynamic from 'next/dynamic';

const LiveKitRoom = dynamic(() => import('@livekit/components-react').then(mod => mod.LiveKitRoom), { ssr: false });
const RoomAudioRenderer = dynamic(() => import('@livekit/components-react').then(mod => mod.RoomAudioRenderer), { ssr: false });
import { useLocalParticipant } from '@livekit/components-react';
import { useState } from "react";
import { FaMicrophone } from 'react-icons/fa';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/python/python';

export default () => {
  const [token, setToken] = useState<string | undefined>(undefined);
  const [url, setUrl] = useState<string | undefined>(undefined);
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
  }

  return (
    <>
      <main className="main-container">
        <div className="top-section">
          <div className="audio-section">
            {token === null ? (
              <button className="connect-button" onClick={async () => {
                const {accessToken, url} = await fetch('/api/token').then(res => res.json());
                setToken(accessToken);
                setUrl(url);
              }}><FaMicrophone /></button>
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
            <input
              type="file"
              className="upload-button"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  // Handle file upload logic here
                  console.log(files[0]);
                }
              }}
            />
          </div>
          </div>
          <div className="output-section">
            <h3>Output</h3>
            <pre>{output}</pre>
          </div>
        </div>
        <div className="bottom-section">
          <div className="coding-repl">
          <CodeMirror
            value={code}
            options={{
              mode: 'python',
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
