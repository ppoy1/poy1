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

export async function createBusinessIdea(kv, { title, description, lookingFor, authorDiscordId, authorUsername }) {
  const ideas = await readBusinessIdeas(kv);
  const idea = {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    title,
    description,
    lookingFor,
    authorDiscordId,
    authorUsername,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  ideas.unshift(idea);
  await writeBusinessIdeas(kv, ideas);
  return idea;
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
