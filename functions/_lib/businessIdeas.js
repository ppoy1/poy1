// Shared helpers for the "business_ideas" board - a beta, owner-only
// feature where players post a new business idea and say what they're
// looking for (partners, investment, advice) from other players. Pure
// website-native content, unrelated to banking - never synced from or to
// the bot, just its own KV key.

const KV_KEY = "business_ideas";

export async function readBusinessIdeas(kv) {
  const raw = await kv.get(KV_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeBusinessIdeas(kv, ideas) {
  await kv.put(KV_KEY, JSON.stringify(ideas));
}

export async function createBusinessIdea(kv, { title, description, lookingFor, authorDiscordId, authorUsername, image }) {
  const ideas = await readBusinessIdeas(kv);
  const idea = {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    title,
    description,
    lookingFor,
    authorDiscordId,
    authorUsername,
    image: image || null,
    status: "open",
    createdAt: new Date().toISOString(),
    comments: [],
  };
  ideas.unshift(idea);
  await writeBusinessIdeas(kv, ideas);
  return idea;
}

// Async discussion thread per idea, not live/real-time chat - Cloudflare
// Pages Functions are request/response, so "live" would need Durable
// Objects (a much bigger addition than this beta needs). Open to anyone
// authenticated, not just the idea's author, since the whole point is
// letting an interested player reach out to the poster.
export async function addComment(kv, ideaId, { authorDiscordId, authorUsername, text }) {
  const ideas = await readBusinessIdeas(kv);
  const idea = ideas.find((i) => i.id === ideaId);
  if (!idea) return { error: "not_found" };
  const comment = {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    authorDiscordId,
    authorUsername,
    text,
    createdAt: new Date().toISOString(),
  };
  idea.comments = idea.comments || [];
  idea.comments.push(comment);
  await writeBusinessIdeas(kv, ideas);
  return { idea };
}

export async function setBusinessIdeaStatus(kv, id, status, requesterDiscordId) {
  const ideas = await readBusinessIdeas(kv);
  const idea = ideas.find((i) => i.id === id);
  if (!idea) return { error: "not_found" };
  if (idea.authorDiscordId !== requesterDiscordId) return { error: "forbidden" };
  idea.status = status;
  await writeBusinessIdeas(kv, ideas);
  return { idea };
}

// No author check here, unlike setBusinessIdeaStatus above - this is an
// owner moderation tool (the caller only needs to be authenticated as
// admin, checked in the endpoint), meant to remove any post regardless
// of who posted it, not just the requester's own.
export async function deleteBusinessIdea(kv, id) {
  const ideas = await readBusinessIdeas(kv);
  const filtered = ideas.filter((i) => i.id !== id);
  if (filtered.length === ideas.length) return { error: "not_found" };
  await writeBusinessIdeas(kv, filtered);
  return { ok: true };
}
