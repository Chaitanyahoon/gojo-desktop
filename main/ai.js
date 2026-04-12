const { net } = require("electron");

let chatHistory = [];
const MAX_GEMINI_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1200;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error) {
  if (!error) return false;
  const statusCode = Number(error.statusCode || 0);
  const message = String(error.message || "");
  return (
    statusCode === 429 ||
    statusCode === 502 ||
    statusCode === 503 ||
    /resource_exhausted/i.test(message) ||
    /rate limit/i.test(message) ||
    /try again/i.test(message)
  );
}

function executeGeminiRequest(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: "POST",
      url: endpoint,
      headers: {
        "Content-Type": "application/json",
      },
    });

    request.on("response", (response) => {
      let data = "";
      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        try {
          if (response.statusCode === 429 || response.statusCode >= 500) {
            const retryError = new Error(
              `Gemini server responded with ${response.statusCode}: ${response.statusMessage || ""}`.trim()
            );
            retryError.statusCode = response.statusCode;
            return reject(retryError);
          }

          const json = JSON.parse(data || "{}");
          if (json.error) {
            const message = String(json.error.message || "Unknown Gemini error.");
            const apiError = new Error(message);
            apiError.statusCode = response.statusCode || 0;
            return reject(apiError);
          }

          const modelText = json.candidates[0]?.content?.parts[0]?.text;
          if (!modelText) {
            return reject(new Error("No response generated."));
          }

          resolve(modelText);
        } catch (e) {
          reject(e);
        }
      });
    });

    request.on("error", (error) => {
      const netError = new Error(error?.message || "Gemini network failure.");
      netError.statusCode = 0;
      reject(netError);
    });

    request.write(payload);
    request.end();
  });
}

async function generateGojoResponse(prompt, apiKey, rizzMode = false, attempt = 0) {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("No API Key provided. Update Settings.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const systemInstruction = {
    role: "model",
    parts: [
      {
        text: rizzMode
          ? "You are Satoru Gojo from Jujutsu Kaisen. You are living on the user's desktop as a virtual pet. You speak casually, are immensely confident, a bit cocky, but friendly. You are also playful and charismatic, with smooth 'rizz' energy. BE VERY BRIEF. You are speaking in a small thought bubble. Maximum 20 words per response. DO NOT USE EMOJIS."
          : "You are Satoru Gojo from Jujutsu Kaisen. You are living on the user's desktop as a virtual pet. You speak casually, are immensely confident, a bit cocky, but friendly. BE VERY BRIEF. You are speaking in a small thought bubble. Maximum 20 words per response. DO NOT USE EMOJIS.",
      },
    ],
  };

  const contents = [...chatHistory, { role: "user", parts: [{ text: prompt }] }];
  const payload = JSON.stringify({
    contents,
    systemInstruction,
  });

  try {
    const modelText = await executeGeminiRequest(endpoint, payload);

    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    chatHistory.push({ role: "model", parts: [{ text: modelText }] });

    if (chatHistory.length > 10) {
      chatHistory = chatHistory.slice(chatHistory.length - 10);
    }

    return modelText;
  } catch (error) {
    if (attempt < MAX_GEMINI_RETRIES && isRetryableGeminiError(error)) {
      const retryDelay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`Gemini retry ${attempt + 1} after ${retryDelay}ms: ${error.message}`);
      await delay(retryDelay);
      return generateGojoResponse(prompt, apiKey, attempt + 1);
    }
    throw error;
  }
}

function clearHistory() {
  chatHistory = [];
}

module.exports = { generateGojoResponse, clearHistory };
