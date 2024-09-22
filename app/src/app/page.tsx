'use client';
import dynamic from 'next/dynamic';
import React, { useState, useRef, useEffect } from "react";
import { useLocalParticipant } from '@livekit/components-react';
import { FaMicrophone, FaUpload, FaPlay } from 'react-icons/fa';
import '@livekit/components-styles';

// Dynamically import LiveKit components to avoid SSR issues
const LiveKitRoom = dynamic(() => import('@livekit/components-react').then(mod => mod.LiveKitRoom), { ssr: false });
const RoomAudioRenderer = dynamic(() => import('@livekit/components-react').then(mod => mod.RoomAudioRenderer), { ssr: false });
const VideoConference = dynamic(() => import('@livekit/components-react').then(mod => mod.VideoConference), { ssr: false });
const ControlBar = dynamic(() => import('@livekit/components-react').then(mod => mod.ControlBar), { ssr: false });

// Dynamically import CodeMirror to avoid SSR issues
const CodeMirror = dynamic(
  () => import('react-codemirror2').then((mod) => mod.Controlled),
  { ssr: false }
);

// Make sure to include these in your _app.js or similar
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/python/python';

export default function InterviewBuddy() {
  const [token, setToken] = useState(null);
  const [url, setUrl] = useState(null);
  const [documents, setDocuments] = useState<File[]>([]);
  const [difficulty, setDifficulty] = useState('medium');
  const [codingQuestion, setCodingQuestion] = useState('');
  const [code, setCode] = useState('# Write your code here');
  const [output, setOutput] = useState('');
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isInterviewStarted) {
      fetchQuestion();
    }
  }, [isInterviewStarted, difficulty]);

  const fetchQuestion = async () => {
    try {
      const response = await fetch(`/api/question?difficulty=${difficulty}`);
      const data = await response.json();
      setCodingQuestion(data.question);
    } catch (error) {
      console.error("Failed to fetch question:", error);
      setCodingQuestion("Error loading question. Please try again.");
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files);
    setDocuments([...documents, ...files]);
    // Here you would typically upload the files to your server
    console.log("Uploaded documents:", files);
  };

  const handleDifficultyChange = (event) => {
    setDifficulty(event.target.value);
  };

  const startInterview = async () => {
    try {
      const response = await fetch('/api/token');
      const { accessToken, serverUrl } = await response.json();
      setToken(accessToken);
      setUrl(serverUrl);
      setIsInterviewStarted(true);
    } catch (error) {
      console.error("Failed to start interview:", error);
    }
  };

  const runCode = async () => {
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      setOutput(result.output);
    } catch (error) {
      console.error("Failed to run code:", error);
      setOutput("Error running code. Please try again.");
    }
  };

  return (
    <div className="interview-buddy" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '20px' }}>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button onClick={() => fileInputRef.current.click()}>
          <FaUpload /> Upload documents
        </button>
        <input
          type="file"
          multiple
          onChange={handleDocumentUpload}
          style={{ display: 'none' }}
          ref={fileInputRef}
        />
        <select value={difficulty} onChange={handleDifficultyChange}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        {!isInterviewStarted && <button onClick={startInterview}>Start Interview</button>}
      </div>
      
      {isInterviewStarted && token ? (
        <LiveKitRoom
          token={token}
          serverUrl={url}
          connectOptions={{autoSubscribe: true}}
          video={true}
          audio={true}
          data-lk-theme="default"
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ display: 'flex', flex: 1 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <VideoConference />
            </div>
            <div style={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, border: '1px solid black', padding: '10px', overflowY: 'auto' }}>
                <h3>Coding Question</h3>
                <p>{codingQuestion}</p>
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
                <button onClick={runCode}><FaPlay /> Run Code</button>
                <div className="output-section">
                  <h4>Output:</h4>
                  <pre>{output}</pre>
                </div>
              </div>
            </div>
          </div>
          <ControlBar />
          <RoomAudioRenderer />
        </LiveKitRoom>
      ) : (
        <div>Welcome to InterviewBuddy. Click "Start Interview" to begin.</div>
      )}
    </div>
  );
}

const ActiveRoom = () => {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  return (
    <>
      <RoomAudioRenderer />
      <button onClick={() => {
        localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled)
      }}>
        <FaMicrophone /> {isMicrophoneEnabled ? 'Mute' : 'Unmute'}
      </button>
    </>
  );
};
