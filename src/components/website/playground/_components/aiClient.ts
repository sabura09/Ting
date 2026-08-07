export async function* streamGeminiResponse(messages: { role: string; content: string; image?: string }[], model: string = "gemini-2.5-flash") {
  // Find a system instruction message. It's either a message with role 'system', containing 'Instructions:', or the first message.
  const instructionMsg = messages.find(m => m.role === 'system') || 
                         messages.find(m => m.content.includes("Instructions:")) || 
                         messages[0];
  const latestMsg = messages[messages.length - 1];
  
  // Prepare body for /api/ai/stream
  const imageData = latestMsg.image;
  let imageBase64 = undefined;
  let imageMimeType = undefined;

  if (imageData && imageData.includes(',')) {
    const parts = imageData.split(',');
    imageBase64 = parts[1];
    imageMimeType = parts[0].split(':')[1]?.split(';')[0] || 'image/jpeg';
  }

  const body = {
    prompt: latestMsg.content,
    image: imageBase64,
    imageMimeType: imageMimeType,
    systemPrompt: instructionMsg?.content, // Pass the big prompt as systemPrompt
    model: model,
    tool: "website-builder",
    isManual: true
  };

  const response = await fetch('/api/ai/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate response');
  }

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6);
        if (dataStr === '[DONE]') break;

        try {
          const data = JSON.parse(dataStr);
          if (data.text) {
            yield { text: data.text };
          }
        } catch (e) {
          // Skip unparseable
        }
      }
    }
  }
}
