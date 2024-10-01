from server import app, pdf_analysis, current_code
import asyncio
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import deepgram, openai, silero

async def entrypoint(ctx: JobContext):
    # Create an initial chat context with a system prompt
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            "You are a voice assistant created to conduct technical interviews. "
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
    await assistant.say("Hello! I'm your mock interviewer today. We'll be discussing topics related to the document you submitted, and I'll also ask you some technical questions. Let's begin with your background. Can you tell me about your relevant experience?", allow_interruptions=True)

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
