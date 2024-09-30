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
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/")
async def read_root():
    return {"message": "Welcome to the FastAPI application!"}

# Global variables
current_code = ""
pdf_analysis = {}

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

async def generate_coding_challenge(difficulty):
    prompt = f"Generate a {difficulty.lower()}-level coding challenge for a Python interview. Include the problem statement and example input/output."
    response = await openai.LLM().complete(prompt=prompt, max_tokens=300)
    return response.text

async def evaluate_solution(solution, difficulty):
    prompt = f"""Evaluate the following {difficulty.lower()}-level Python solution:

    {solution}

    Provide feedback on:
    1. Correctness
    2. Code efficiency
    3. Code style and best practices
    4. Potential improvements

    Be concise but thorough in your evaluation."""

    response = await openai.LLM().complete(prompt=prompt, max_tokens=300)
    return response.text

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), difficulty: str = Form(...)):
    global pdf_analysis
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
    global current_code
    current_code = code
    return JSONResponse(content={"message": "Code updated successfully"})

@app.post("/api/run-code")
async def run_code(code: str = Body(...)):
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

async def entrypoint(ctx: JobContext):
    global current_code, pdf_analysis
    
    # Create an initial chat context with a system prompt
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            "You are a voice assistant created by LiveKit to conduct technical interviews. "
            "Your interface with users will be voice. Use short and concise responses, "
            "avoiding usage of unpronounceable punctuation. "
            f"Here's a summary of a document relevant to the interview:\n\n{pdf_analysis.get('summary', 'No summary available.')}\n\n"
            f"Here are some interview questions based on the document:\n\n{pdf_analysis.get('interview_questions', 'No questions available.')}\n\n"
            "Use this information to guide your interview. Ask follow-up questions based on the candidate's responses. "
            "You will also be aware of the code the candidate is writing. Provide guidance and ask questions about their code when appropriate. "
            "The candidate can run their code, and you'll be informed of the output. Use this information to provide feedback and suggestions."
        ),
    )

    # Connect to the LiveKit room
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # VoiceAssistant is a class that creates a full conversational AI agent.
    assistant = VoiceAssistant(
        vad=silero.VAD.load(),
        stt=deepgram.STT(),
        llm=openai.LLM(),
        tts=openai.TTS(),
        chat_ctx=initial_ctx,
    )

    # Start the voice assistant with the LiveKit room
    assistant.start(ctx.room)
    await asyncio.sleep(1)

    # Greets the user with an initial message
    await assistant.say("Hello! I'm your AI interviewer today. We'll be discussing topics related to the document you submitted, and I'll also ask you some technical questions. Let's begin with your background. Can you tell me about your relevant experience?", allow_interruptions=True)

    # Main interview loop
    while True:
        # Wait for user response
        user_response = await assistant.listen()

        # Check the current code and incorporate it into the context if it exists
        code_context = f"\n\nThe candidate's current code is:\n\n{current_code}" if current_code else ""

        # Process user response and generate next question
        next_question = await openai.LLM().complete(
            prompt=f"Based on the candidate's response: '{user_response}'{code_context}, generate the next relevant interview question or provide feedback on their code. If they've run the code, comment on the output as well. Be concise.",
            max_tokens=150
        )

        # Ask the next question or provide feedback
        await assistant.say(next_question.text, allow_interruptions=True)

        # Check if interview should end (you may want to implement a more sophisticated mechanism)
        if "ENDINTERVIEW" in user_response.upper():
            break

    # End the interview
    await assistant.say("Thank you for your time today. The interview is now complete. Do you have any questions for me?", allow_interruptions=True)

if __name__ == "__main__":
    # Initialize the worker with the entrypoint
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
