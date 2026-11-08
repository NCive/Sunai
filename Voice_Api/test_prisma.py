
import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from gnani.stt import GnaniSTTStreamClient

load_dotenv()

AUDIO_FILE = Path("samples/tests/sample.pcm")


async def main():
    if not os.getenv("GNANI_API_KEY"):
        raise RuntimeError("GNANI_API_KEY is missing from .env")

    if not AUDIO_FILE.exists():
        raise FileNotFoundError(f"Audio file not found: {AUDIO_FILE}")

    print("Connecting to Prisma v3.0...")

    async with GnaniSTTStreamClient(
        language_code="hi-IN",
        model="prisma-v3.0",
        sample_rate=16000,
    ) as stream:
        print("WebSocket connected.")
        print("Sending audio...")

        transcripts = await stream.stream_audio(
            open(AUDIO_FILE, "rb"),
            on_transcript=lambda event: print(
                f"Transcript: {event.text}"
            ),
            on_processing=lambda event: print("Processing audio..."),
            realtime_pace=True,
        )

        print(f"\nCompleted. Transcript segments: {len(transcripts)}")

        for item in transcripts:
            print(item.text)


if __name__ == "__main__":
    asyncio.run(main())
