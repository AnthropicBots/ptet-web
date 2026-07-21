const OpenAI = require('openai');

/**
 * Evaluates a speaking answer's transcript using OpenAI.
 * Returns a structured JSON containing scores and feedback.
 * 
 * @param {string} transcript The transcribed text from the user's audio
 * @param {object} questionContent The prompt or text of the question
 * @param {object} scoringRubric The rubric rules for this question
 */
const evaluateSpeakingAnswer = async (transcript, questionContent, scoringRubric) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key') {
    throw new Error('OPENAI_API_KEY is not properly configured');
  }

  const openai = new OpenAI({ apiKey });

  const systemMessage = `
You are an expert PTE (Pearson Test of English) examiner. 
You will be provided with:
1. The question content/prompt.
2. The scoring rubric or instructions.
3. The transcription of the student's speaking answer.

Your task is to evaluate the student's answer based on the provided rubric. 
Since you only have the transcript and not the audio, estimate Fluency and Pronunciation based on text cohesiveness, grammatical structures, filler words (e.g. um, ah) if transcribed, and overall sense. Score Content strictly based on how well it addresses the prompt.

You MUST respond strictly in JSON format matching the following schema:
{
  "fluencyScore": number (0-90),
  "pronunciationScore": number (0-90),
  "contentScore": number (0-90),
  "overallScore": number (0-90),
  "feedback": string (Detailed explanation of the scores and how the user can improve)
}
  `;

  const userMessage = `
Question Content:
${JSON.stringify(questionContent)}

Scoring Rubric:
${JSON.stringify(scoringRubric || "Standard PTE speaking rubric: Content, Fluency, Pronunciation. Max score 90.")}

Student's Transcript:
"${transcript}"
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const resultString = response.choices[0].message.content;
    const parsedResult = JSON.parse(resultString);

    return parsedResult;
  } catch (error) {
    console.error('Error in AI Scoring Service:', error);
    throw error;
  }
};

module.exports = {
  evaluateSpeakingAnswer
};
