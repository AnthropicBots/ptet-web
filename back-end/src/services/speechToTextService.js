const { AssemblyAI } = require('assemblyai');

const transcribeAudioUrl = async (audioUrl) => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey || apiKey === 'your_assemblyai_api_key') {
    throw new Error('ASSEMBLYAI_API_KEY is not properly configured');
  }

  const client = new AssemblyAI({ apiKey });

  try {
    const transcript = await client.transcripts.transcribe({
      audio_url: audioUrl
    });

    if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error}`);
    }

    return transcript.text;
  } catch (error) {
    console.error('AssemblyAI Transcription Error:', error);
    throw error;
  }
};

module.exports = {
  transcribeAudioUrl
};
