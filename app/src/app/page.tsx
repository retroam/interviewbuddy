'use client';

import { useState, useEffect, useRef } from "react";
import {
  BarVisualizer,
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  VoiceAssistantControlBar,
} from '@livekit/components-react';
import "@livekit/components-styles";
import dynamic from 'next/dynamic';


const CodeMirror = dynamic(
  () => import('@uiw/react-codemirror').then((mod) => mod.default),
  { ssr: false }
);

import { python } from '@codemirror/lang-python';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

export default function InterviewBuddy() {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string>("MEDIUM");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [codingChallenge, setCodingChallenge] = useState<string | null>(null);
  const [userSolution, setUserSolution] = useState<string>("");
  const [codeOutput, setCodeOutput] = useState<string>("");
  const [evaluationOutput, setEvaluationOutput] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let uploadSuccess = false;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("difficulty", difficulty);

        try {
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (uploadResponse.ok) {
            uploadSuccess = true;
            setUploadStatus("Document uploaded successfully!");
          } else {
            setUploadStatus("Failed to upload document, but we'll proceed without it.");
          }
        } catch (uploadError) {
          console.error('Upload failed:', uploadError);
          setUploadStatus("Failed to upload document, but we'll proceed without it.");
        }
      }

      const tokenResponse = await fetch(`/api/token?difficulty=${difficulty}&documentUploaded=${uploadSuccess}`);
      if (!tokenResponse.ok) {
        throw new Error(`HTTP error! status: ${tokenResponse.status}`);
      }
      const { accessToken, url } = await tokenResponse.json();
      setToken(accessToken);
      setUrl(url);
    } catch (error) {
      console.error('Failed to connect:', error);
      setErrorMessage('Failed to connect. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setUploadStatus("File selected: " + selectedFile.name);
    } else {
      setFile(null);
      setUploadStatus("Please select a valid PDF file.");
    }
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCodeChange = (value: string) => {
    setUserSolution(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updateCodeInBackend(value);
    }, 1000);
  };

  const updateCodeInBackend = async (code: string) => {
    try {
      await fetch('/api/update-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
    } catch (error) {
      console.error('Failed to update code in backend:', error);
    }
  };

  const handleRunCode = async () => {
    setIsRunningCode(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // Change to text/plain
        body: userSolution, // Send the code as a raw string
      });
  
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
  
      const result = await response.json();
      setCodeOutput(result.output);
    } catch (error) {
      console.error('Failed to run code:', error);
      setCodeOutput('An error occurred while running the code.');
    } finally {
      setIsRunningCode(false);
    }
  };
  const handleSubmitSolution = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/submit-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution: userSolution, difficulty }),
      });
      const result = await response.json();
      setEvaluationOutput(result.output);
    } catch (error) {
      console.error('Failed to submit solution:', error);
      setEvaluationOutput('An error occurred while submitting your solution.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetch(`http://127.0.0.1:8000/api/coding-challenge?difficulty=${difficulty}`)
        .then(res => res.json())
        .then(data => setCodingChallenge(data.challenge))
        .catch(err => console.error('Failed to fetch coding challenge:', err));
    }
  }, [token, difficulty]);

  return (
    <div className="interview-buddy">
      {token === null ? (
        <div className="welcome-screen">
          <h1>Interview Buddy</h1>
          <div className="options">
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option>EASY</option>
              <option>MEDIUM</option>
              <option>HARD</option>
            </select>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />
            <button onClick={handleFileUpload}>Upload Document (Optional)</button>
            <button onClick={handleConnect} disabled={isLoading}>
              {isLoading ? 'Connecting...' : 'Start Interview'}
            </button>
          </div>
          {uploadStatus && <div className="upload-status">{uploadStatus}</div>}
          {errorMessage && <div className="error-message">{errorMessage}</div>}
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
                <pre>{codingChallenge}</pre>
                <CodeMirror
                  value={userSolution}
                  height="200px"
                  theme={vscodeDark}
                  extensions={[python()]}
                  onChange={handleCodeChange}
                />
                <div className="button-group">
                  <button onClick={handleRunCode} disabled={isRunningCode}>
                    {isRunningCode ? 'Running...' : 'Run Code'}
                  </button>
                  <button onClick={handleSubmitSolution} disabled={isLoading}>
                    {isLoading ? 'Submitting...' : 'Submit Solution'}
                  </button>
                </div>
                <div className="output-section">
                  <h4>Code Output:</h4>
                  <pre>{codeOutput}</pre>
                </div>
                <div className="output-section">
                  <h4>Evaluation Output:</h4>
                  <pre>{evaluationOutput}</pre>
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
        .options button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
        .coding-section .cm-editor {
          border: 1px solid #ccc;
          border-radius: 5px;
          overflow: hidden;
        }
        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }
        .button-group button {
          flex: 1;
          background-color: #008000;
          color: #ffffff;
          border: none;
          padding: 10px;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        .button-group button:hover {
          background-color: #006400;
        }
        .button-group button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
        .error-message {
          color: #ff0000;
          margin-top: 10px;
          text-align: center;
        }
        .upload-status {
          color: #008000;
          margin-top: 10px;
          text-align: center;
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
      style={{ height: '300px', color: '#006400' }} // Deep green color
    />
  );
};
