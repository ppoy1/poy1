const params = new URLSearchParams(window.location.search);
const id = params.get("discord_id");
const username = params.get("discord_username");
if (id) {
  document.getElementById("discord-info").textContent =
    `Logged in as Discord user "${username}" (ID: ${id}) - this ID isn't in the linked-accounts list.`;
}
