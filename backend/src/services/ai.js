// Thin wrapper around the Claude API. Every feature that uses it has a
// non-AI fallback, so the app still works when ANTHROPIC_API_KEY is not set.
const config = require('../config');

let client;
function getClient() {
  if (!config.anthropicApiKey) return null;
  if (!client) {
    const Anthropic = require('@anthropic-ai/sdk');
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return client;
}

const isEnabled = () => Boolean(config.anthropicApiKey);

// Returns the reply text, or null when the model declines (the caller then
// uses its non-AI fallback).
async function complete({ system, prompt, maxTokens = 16000 }) {
  const anthropic = getClient();
  if (!anthropic) return null;
  const response = await anthropic.beta.messages.create({
    model: config.anthropicModel,
    max_tokens: maxTokens,
    // If a safety classifier declines, let the API retry on a suitable model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  if (response.stop_reason === 'refusal') return null;
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

// Test hook: lets tests swap in a fake client.
function setClientForTests(fake) {
  client = fake;
}

module.exports = { complete, isEnabled, setClientForTests };
