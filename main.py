import asyncio
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import deepgram, openai, silero
import PyPDF2
import os

# Function to read, summarize, and delete PDF
async def process_and_delete_pdf(file_path):
    try:
        # Read PDF
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text()

        # Summarize using OpenAI
        summary = await openai.LLM().complete(
            prompt=f"Please summarize the following text concisely:\n\n{text}",
            max_tokens=200
        )

        # Delete the file
        os.remove(file_path)
        print(f"File {file_path} has been processed and deleted.")

        return summary.text

    except FileNotFoundError:
        print(f"Error: The file {file_path} was not found.")
        return "No PDF found to summarize."
    except Exception as e:
        print(f"An error occurred while processing the file: {str(e)}")
        return f"An error occurred while processing the document: {str(e)}"

# This function is the entrypoint for the agent.
async def entrypoint(ctx: JobContext):
    # Process PDF and delete it (assuming the PDF is named 'document.pdf' in the same directory)
    pdf_path = 'document.pdf'
    summary = await process_and_delete_pdf(pdf_path)

    # Create an initial chat context with a system prompt including the summary
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            "You are a voice assistant created by LiveKit. Your interface with users will be voice. "
            "You should use short and concise responses, and avoiding usage of unpronounceable punctuation. "
            f"Here's a summary of a document that may be relevant to the conversation:\n\n{summary}\n\n"
            "Use this information if it's relevant to the user's questions."
        ),
    )

    # Connect to the LiveKit room
    # indicating that the agent will only subscribe to audio tracks
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
    await assistant.say("Hello! I've reviewed a document that might be relevant to our conversation. How can I assist you today?", allow_interruptions=True)

if __name__ == "__main__":
    # Initialize the worker with the entrypoint
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))