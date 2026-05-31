require("dotenv").config();

const { REST, Routes } = require("discord.js");
const { commands } = require("./index");

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error("Brakuje TOKEN, CLIENT_ID albo GUILD_ID w pliku .env.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("Rejestrowanie komend...");

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands.map((command) => command.toJSON()),
    });

    console.log("Komendy zarejestrowane.");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
