import asyncio
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import deepgram, openai, silero
import fitz  # PyMuPDF
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
import os
import tempfile
import subprocess
from fastapi import FastAPI, File, UploadFile, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI()

# Allow CORS for all origins (adjust as needed for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
current_code = ""  # Initialize as an empty string
pdf_analysis = {}  # Initialize as an empty dictionary

@app.get("/")
async def read_root():
    return {"message": "Welcome to the FastAPI application!"}

async def process_and_analyze_pdf(file_path):
    try:
        # Read PDF
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        
        # Summarize using OpenAI
        summary = await openai.LLM().complete(
            prompt=f"Please summarize the following text concisely:\n\n{text}",
            max_tokens=200
        )
        
        # Extract key topics
        vectorizer = TfidfVectorizer(stop_words='english', max_features=10)
        tfidf_matrix = vectorizer.fit_transform([text])
        feature_names = vectorizer.get_feature_names_out()
        tfidf_sorting = np.argsort(tfidf_matrix.toarray()).flatten()[::-1]
        top_topics = [feature_names[i] for i in tfidf_sorting[:5]]
        
        # Generate interview questions based on topics
        questions = await openai.LLM().complete(
            prompt=f"Generate 3 interview questions based on these topics: {', '.join(top_topics)}",
            max_tokens=150
        )
        
        return {
            "summary": summary.text,
            "top_topics": top_topics,
            "interview_questions": questions.text
        }
    
    except Exception as e:
        print(f"An error occurred while processing the file: {str(e)}")
        return {"error": str(e)}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), difficulty: str = Form(...)):
    global pdf_analysis  # Declare the global variable
    try:
        # Save the uploaded file
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        # Process the PDF
        pdf_analysis = await process_and_analyze_pdf(file_path)

        # Delete the file after processing
        os.remove(file_path)

        return JSONResponse(content={"message": "File uploaded and processed successfully", "analysis": pdf_analysis})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/api/update-code")
async def update_code(code: str = Body(...)):
    global current_code  # Declare the global variable
    current_code = code  # Update the global variable with the new code
    return JSONResponse(content={"message": "Code updated successfully"})

@app.post("/api/run-code")
async def run_code(code: str = Body(...)):
    global current_code  # Declare the global variable to ensure it's in sync
    current_code = code  # Update the global variable with the new code

    try:
        # Create a temporary file to store the code
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
            temp_file.write(code)
            temp_file_path = temp_file.name

        # Run the code in a separate process with a timeout
        process = subprocess.Popen(['python', temp_file_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            stdout, stderr = process.communicate(timeout=10)  # 10 seconds timeout
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()  # Ensure process resources are released
            return JSONResponse(content={"output": "Code execution timed out after 10 seconds."})

        # Delete the temporary file
        os.unlink(temp_file_path)

        # Combine stdout and stderr
        output = stdout.decode() + stderr.decode()

        return JSONResponse(content={"output": output})
    except Exception as e:
        return JSONResponse(content={"output": f"An error occurred: {str(e)}"})
    finally:
        # Ensure the temporary file is deleted even if an error occurs
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

@app.post("/api/submit-solution")
async def submit_solution(solution: str = Body(...), difficulty: str = Body(...)):
    evaluation = await evaluate_solution(solution, difficulty)
    return JSONResponse(content={"output": evaluation})

@app.get("/api/coding-challenge")
async def get_coding_challenge(difficulty: str):
    challenge = await generate_coding_challenge(difficulty)
    return JSONResponse(content={"challenge": challenge})
