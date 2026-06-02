require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ModalBuilder,
  Partials,
  PermissionsBitField,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const CONFIG_PATH = path.join(__dirname, "config.json");
const BRAND = "WalkBots™ 👻";
const COLOR = "#ff0000";
const giveaways = new Map();
const giveawayTimers = new Map();
let lastEndedGiveaway = null;
const stickyCooldowns = new Set();
const creatingTickets = new Set();
const spamTracker = new Map();
const counterUpdateTimers = new Map();

const SETTINGS = {
  shopName: "WalkBots™",
  ticketPanelImageUrl: "https://cdn.discordapp.com/icons/1510673877091750078/2388c27ca034bdc5e7fdb73a07fbf63e.webp?size=100&quality=lossless",
  welcomeChannelId: "1510673878735917198",
  leaveChannelId: "1511054280348668057",
  verifyRoleIds: [
    "1511054437118906450",
  ],
  joinRoleIds: [
    "1510673877100134571",
  ],
  antiLinkEnabled: true,
  antiLinkMuteMs: 5 * 60 * 1000,
  antiLinkBypassRoleIds: [1492219296208785644,

  ],
  antiSpamEnabled: true,
  antiSpamMaxMessages: 5,
  antiSpamWindowMs: 6 * 1000,
  antiSpamMuteMs: 5 * 60 * 1000,
  antiSpamBypassRoleIds: [],
  ticketCategoryId: "1492219297915994215",
  ticketCategoryIds: {
    "bot-discord": "1510673878291316797",
    "hosting-bota-discord": "1510673878291316798",
    pytanie: "1510673878291316804",
    partnerstwo: "1510673878534328603",
  },
  ticketSupportRoleIds: ["1510673877112459346",
  ],
  ticketCategoryRoleIds: {
    pytanie: ["1510673877112459346",
],
  },
  ticketTypes: {
    "bot-discord": "bot discord",
    "hosting-bota-discord": "hosting bota discord",
    pytanie: "pytanie",
    partnerstwo: "partnerstwo",
  },
  ticketEmojis: {
    "bot-discord": "<:bio:1510673960541622504>",
    "hosting-bota-discord": "<:hosting:1510673978061230130>",
    pytanie: "<:pytanie:1510673970377129995>",
    partnerstwo: "<:partnerstwo:1510673968749875311>",
  },
  legitEmojis: {
    yes: "<a:tak:1511069596843638884>",
    no: "<a:nie:1511069510101242147>",
  },
  legitCounterChannelId: "1510673879436361945",
  vouchCounterChannelId: "1510673878916137141",
  reactionRoles: {
    // "ID_WIADOMOSCI": {
    //   "EMOJI_ALBO_ID_EMOJI": "ID_ROLI"
    // }
  },
};

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return {
      stickyMessages: {},
    };
  }

  const loaded = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  return {
    stickyMessages: loaded.stickyMessages || {},
  };
}

let config = loadConfig();

function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
}

function baseEmbed(title, description) {
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(title)
    .setTimestamp();

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

function ticketPanelEmbed() {
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setDescription(
      [
        "```",
        `🎫  ${SETTINGS.shopName} × TICKETY`,
        "```",
        "> `📩` **× Wybierz odpowiednią kategorię, aby utworzyć ticketa.**",
        "",
        "> Prosimy o zachowanie cierpliwości na ticketach.",
      ].join("\n")
    );

  if (SETTINGS.ticketPanelImageUrl) {
    embed.setThumbnail(SETTINGS.ticketPanelImageUrl);
  }

  return embed;
}

function legitPanelEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setDescription(
      [
        "```",
        `🤔  ${SETTINGS.shopName} × CZY LEGIT?`,
        "```",
        `❓ **Czy nasz serwer ${SETTINGS.shopName} jest LEGIT?**`,
        "",
        `• ${SETTINGS.legitEmojis.yes} Jeżeli uważasz, że **TAK** zaznacz reakcję ${SETTINGS.legitEmojis.yes} poniżej!`,
        `• ${SETTINGS.legitEmojis.no} Jeżeli uważasz, że **NIE** zaznacz reakcję ${SETTINGS.legitEmojis.no} poniżej!`,
        "",
        `> Zaznaczenie reakcji ${SETTINGS.legitEmojis.no} bez dowodu skutkuje`,
        "> **automatycznym tymczasowym wyciszeniem!**",
      ].join("\n")
    )
    .setThumbnail(SETTINGS.ticketPanelImageUrl);
}

function ticketPanelSmallImageEmbeds() {
  return (SETTINGS.ticketPanelSmallImageUrls || [])
    .filter(Boolean)
    .slice(0, 2)
    .map((imageUrl) => new EmbedBuilder().setColor(COLOR).setThumbnail(imageUrl));
}


function verificationPanelEmbed(guild) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("<:tak:1510346070188884082> ``WalkBots™ × WERYFIKACJA``")
    .setDescription("Kliknij przycisk poniżej, aby się zweryfikować.")
    .setFooter({
      text: "WalkBots™ × WERYFIKACJA",
      iconURL: guild.iconURL({ dynamic: true }),
    });
}

function isAdmin(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

function cleanChannelName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 24);
}

function isTicketChannel(channel) {
  return channel?.type === ChannelType.GuildText && channel.name.startsWith("ticket-");
}

function ticketTypeFromChannel(channel) {
  return channel?.topic?.match(/^Ticket: ([^|]+)/)?.[1]?.trim() || null;
}

function ticketAccessRoleIds(type) {
  return [
    ...(SETTINGS.ticketSupportRoleIds || []),
    ...(SETTINGS.ticketCategoryRoleIds?.[type] || []),
  ].filter(Boolean);
}

async function ticketParentId(guild, type) {
  const label = SETTINGS.ticketTypes[type] || type;
  const configuredId = SETTINGS.ticketCategoryIds?.[type] || SETTINGS.ticketCategoryId;

  if (configuredId) {
    const configuredCategory = await guild.channels.fetch(configuredId).catch(() => null);
    if (configuredCategory?.type === ChannelType.GuildCategory) {
      return configuredCategory.id;
    }
  }

  const categoryName = `TICKETY - ${label}`.slice(0, 100);
  const existingCategory = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === categoryName
  );

  if (existingCategory) return existingCategory.id;

  const category = await guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
  });

  return category.id;
}

async function resolveTicketEmoji(guild, value) {
  const emoji = SETTINGS.ticketEmojis[value];

  if (!emoji) return null;

  if (typeof emoji === "string") {
    const customEmoji = emoji.match(/^<(?<animated>a?):(?<name>[a-zA-Z0-9_]+):(?<id>\d+)>$/);
    if (customEmoji?.groups) {
      return {
        id: customEmoji.groups.id,
        name: customEmoji.groups.name,
        animated: customEmoji.groups.animated === "a",
      };
    }

    if (!/^\d+$/.test(emoji)) {
      return { name: emoji };
    }
  }

  const emojiId = typeof emoji === "string" ? emoji : emoji.id;
  if (!emojiId) return emoji;

  const guildEmoji = await guild.emojis.fetch(emojiId).catch(() => null);
  if (!guildEmoji) {
    console.warn(`Pomijam emoji ticketa "${value}" - nie znaleziono emoji o ID ${emojiId}.`);
    return null;
  }

  return {
    id: guildEmoji.id,
    name: guildEmoji.name,
    animated: guildEmoji.animated,
  };
}

async function ticketOption(guild, value, label) {
  const option = {
    label: String(label).slice(0, 100),
    description: `Utwórz ticket: ${label}`.slice(0, 100),
    value,
  };

  const emoji = await resolveTicketEmoji(guild, value);
  if (emoji) {
    option.emoji = emoji;
  }

  return option;
}

function parseDuration(input) {
  const match = input.toLowerCase().match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;

  const value = Number(match[1]);
  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * units[match[2]];
}

function formatDuration(input) {
  const match = input.toLowerCase().match(/^(\d+)(s|m|h|d)$/);
  if (!match) return input;

  const labels = {
    s: "sekund",
    m: "minut",
    h: "godzin",
    d: "dni",
  };

  return `${match[1]} ${labels[match[2]]}`;
}

function formatRemainingTime(endsAt) {
  const remainingMs = Math.max(0, endsAt * 1000 - Date.now());
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function giveawayEmbed(giveaway, guild) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle("`WalkBots™ × KONKURS`")
    .addFields(
      {
        name: "Nagroda",
        value: `**${giveaway.prize}**`,
        inline: false,
      },
      {
        name: "Czas",
        value: `**${formatRemainingTime(giveaway.endsAt)}**`,
        inline: true,
      },
      {
        name: "Koniec",
        value: `<t:${giveaway.endsAt}:f>`,
        inline: true,
      },
      {
        name: "Opis",
        value: giveaway.description || "Brak",
        inline: false,
      },
      {
        name: "Uczestnicy",
        value: `**${giveaway.members.size}**`,
        inline: false,
      }
    )
    .setFooter({
      text: "WalkBots™ × KONKURSY",
      iconURL: guild.iconURL({ dynamic: true }),
    });
}

function normalizeEmoji(reaction) {
  return reaction.emoji.id || reaction.emoji.name;
}

function emojiIdFromMarkup(emoji) {
  return String(emoji).match(/:(\d+)>$/)?.[1] || emoji;
}

async function fetchTextChannel(guild, channelId) {
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  return channel?.type === ChannelType.GuildText ? channel : null;
}

async function countMessages(channel) {
  let total = 0;
  let before;

  while (true) {
    const options = { limit: 100 };
    if (before) options.before = before;

    const messages = await channel.messages.fetch(options).catch(() => null);
    if (!messages?.size) break;

    total += messages.size;
    before = messages.last().id;

    if (messages.size < 100) break;
  }

  return total;
}

async function countEmojiReactions(channel, emojiId) {
  let total = 0;
  let before;

  while (true) {
    const options = { limit: 100 };
    if (before) options.before = before;

    const messages = await channel.messages.fetch(options).catch(() => null);
    if (!messages?.size) break;

    for (const message of messages.values()) {
      const reaction = message.reactions.cache.find(
        (cachedReaction) => normalizeEmoji(cachedReaction) === emojiId
      );

      if (reaction) {
        total += Math.max(0, reaction.count - 1);
      }
    }

    before = messages.last().id;

    if (messages.size < 100) break;
  }

  return total;
}

async function renameChannelIfNeeded(channel, name) {
  if (!channel || channel.name === name) return;

  await channel.setName(name).catch((error) => {
    console.error(`Nie udalo sie zmienic nazwy kanalu ${channel.id}:`, error);
  });
}

async function updateLegitCounter(guild) {
  const channel = await fetchTextChannel(guild, SETTINGS.legitCounterChannelId);
  if (!channel) return;

  const count = await countEmojiReactions(channel, emojiIdFromMarkup(SETTINGS.legitEmojis.yes));
  await renameChannelIfNeeded(channel, `「🤔」czy˙legit➔${count}`);
}

async function updateVouchCounter(guild) {
  const channel = await fetchTextChannel(guild, SETTINGS.vouchCounterChannelId);
  if (!channel) return;

  const count = await countMessages(channel);
  await renameChannelIfNeeded(channel, `「✅」vouch➔${count}`);
}

function scheduleCounterUpdate(guild, key, updateFn, delayMs = 5000) {
  if (counterUpdateTimers.has(key)) {
    clearTimeout(counterUpdateTimers.get(key));
  }

  counterUpdateTimers.set(
    key,
    setTimeout(async () => {
      counterUpdateTimers.delete(key);
      await updateFn(guild);
    }, delayMs)
  );
}

function hasBlockedLink(content) {
  return /(https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/|dc\.gg\/|\.pl\b|\.com\b|\.net\b|\.gg\b)/i.test(
    content
  );
}

function hasBlockedGif(message) {
  if (/(tenor\.com|giphy\.com|\.gif\b|\.gifv\b)/i.test(message.content)) {
    return true;
  }

  return message.attachments.some((attachment) => {
    const name = attachment.name || attachment.url || "";
    const type = attachment.contentType || "";

    return type.toLowerCase().includes("gif") || /\.gif(v)?(\?|$)/i.test(name);
  });
}

function canBypassAntiLink(member) {
  if (isAdmin(member)) return true;
  return SETTINGS.antiLinkBypassRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

function canBypassAntiSpam(member) {
  if (isAdmin(member)) return true;
  return SETTINGS.antiSpamBypassRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

async function handleAntiSpam(message) {
  if (!SETTINGS.antiSpamEnabled || canBypassAntiSpam(message.member)) {
    return false;
  }

  const now = Date.now();
  const key = `${message.guild.id}:${message.author.id}`;
  const timestamps = (spamTracker.get(key) || []).filter(
    (timestamp) => now - timestamp < SETTINGS.antiSpamWindowMs
  );

  timestamps.push(now);
  spamTracker.set(key, timestamps);

  if (timestamps.length < SETTINGS.antiSpamMaxMessages) {
    return false;
  }

  spamTracker.delete(key);

  if (message.member?.moderatable) {
    await message.member.timeout(SETTINGS.antiSpamMuteMs, "Antyspam: zbyt duzo wiadomosci").catch((error) => {
      console.error("Nie udalo sie nadac timeoutu za spam:", error);
    });
  }

  const warning = await message.channel.send({
    content: `${message.author}, nie spamuj. Dostales wyciszenie za spam.`,
  }).catch(() => null);

  setTimeout(() => warning?.delete().catch(() => null), 5000);
  return true;
}

async function sendSticky(channel) {
  const sticky = config.stickyMessages[channel.id];
  if (!sticky || stickyCooldowns.has(channel.id)) return;

  stickyCooldowns.add(channel.id);

  setTimeout(async () => {
    stickyCooldowns.delete(channel.id);

    const current = config.stickyMessages[channel.id];
    if (!current) return;

    if (current.lastMessageId) {
      const oldMessage = await channel.messages
        .fetch(current.lastMessageId)
        .catch(() => null);
      await oldMessage?.delete().catch(() => null);
    }

    const message = await channel.send({
      embeds: [baseEmbed(`${BRAND} x STICKY`, current.text)],
    });

    current.lastMessageId = message.id;
    saveConfig();
  }, 1500);
}

function stopGiveawayTimer(giveawayId) {
  const timer = giveawayTimers.get(giveawayId);
  if (timer) {
    clearInterval(timer);
    giveawayTimers.delete(giveawayId);
  }
}

function startGiveawayTimer(giveawayId) {
  stopGiveawayTimer(giveawayId);

  const timer = setInterval(async () => {
    const giveaway = giveaways.get(giveawayId);
    if (!giveaway) {
      stopGiveawayTimer(giveawayId);
      return;
    }

    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    const message = await channel?.messages.fetch(giveaway.messageId).catch(() => null);

    if (!message) {
      stopGiveawayTimer(giveawayId);
      return;
    }

    await message.edit({
      embeds: [giveawayEmbed(giveaway, message.guild)],
    }).catch(() => null);
  }, 10000);

  giveawayTimers.set(giveawayId, timer);
}

async function endGiveaway(giveawayId) {
  const giveaway = giveaways.get(giveawayId);
  if (!giveaway) return;

  giveaways.delete(giveawayId);
  stopGiveawayTimer(giveawayId);

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  const message = await channel?.messages.fetch(giveaway.messageId).catch(() => null);

  const disabledButton = new ButtonBuilder()
    .setCustomId(`giveaway_join_${giveawayId}`)
    .setLabel("Giveaway zakonczony")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  await message?.edit({
    components: [new ActionRowBuilder().addComponents(disabledButton)],
  }).catch(() => null);

  if (!channel) return;

  if (giveaway.members.size === 0) {
    lastEndedGiveaway = {
      ...giveaway,
      members: new Set(giveaway.members),
      lastWinners: [],
      endedAt: Date.now(),
    };
    await channel.send(`Giveaway **${giveaway.prize}** zakonczony. Nikt nie wzial udzialu.`);
    return;
  }

  const participants = Array.from(giveaway.members).sort(() => Math.random() - 0.5);
  const winners = participants.slice(0, Math.min(giveaway.winners, participants.length));
  const winnerText = winners.map((winnerId) => `<@${winnerId}>`).join(", ");
  lastEndedGiveaway = {
    ...giveaway,
    members: new Set(giveaway.members),
    lastWinners: winners,
    endedAt: Date.now(),
  };

  await channel.send(`Giveaway **${giveaway.prize}** zakonczony. Wygrywa: ${winnerText}!`);
}

async function createTicket(interaction, type, answers = {}) {
  const label = SETTINGS.ticketTypes[type] || type;
  const lockKey = `${interaction.guild.id}:${interaction.user.id}`;

  if (creatingTickets.has(lockKey)) {
    return interaction.reply({
      content: "Ticket jest juz tworzony, poczekaj chwile.",
      ephemeral: true,
    });
  }

  creatingTickets.add(lockKey);

  try {
    await interaction.deferReply({ ephemeral: true });

    const existing = interaction.guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildText &&
        channel.topic?.includes(`User: ${interaction.user.id}`) &&
        channel.name.startsWith(`ticket-${type}-`)
    );

    if (existing) {
      return interaction.editReply({
        content: `Masz juz otwarty ticket: ${existing}.`,
      });
    }

    const permissionOverwrites = [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      },
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      },
    ];

    for (const roleId of ticketAccessRoleIds(type)) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      });
    }

    const parentId = await ticketParentId(interaction.guild, type);

    const channel = await interaction.guild.channels.create({
      name: `ticket-${type}-${cleanChannelName(interaction.user.username)}`,
      type: ChannelType.GuildText,
      parent: parentId || null,
      topic: `Ticket: ${type} | User: ${interaction.user.id}`,
      permissionOverwrites,
    });

    const closeButton = new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Zamknij ticket")
      .setStyle(ButtonStyle.Danger);

    const claimButton = new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("Przejmij")
      .setStyle(ButtonStyle.Success);

    const embed = baseEmbed(`${BRAND} x ${label.toUpperCase()}`)
      .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: "-  <:Members:1510673928182567052> Informacje o uzytkowniku",
          value: [
            `> -Ping: ${interaction.user}`,
            `> -Nick: **${interaction.user.username}**`,
            `> -ID: \`${interaction.user.id}\``,
          ].join("\n"),
          inline: false,
        },
        {
          name: "-  <:edit:1510673909668642977> z Informacje z formularza",
          value: formatTicketAnswers(type, answers),
          inline: false,
        }
      );

    await channel.send({
      content: "@everyone",
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(claimButton, closeButton)],
    });

    return interaction.editReply({
      content: `Ticket utworzony: ${channel}.`,
    });
  } catch (error) {
    console.error("Blad tworzenia ticketa:", error);

    const message =
      error?.code === 50013
        ? "Nie moge stworzyc ticketa. Daj botu uprawnienia: Zarzadzanie kanalami, Widok kanalu, Wysylanie wiadomosci."
        : "Nie udalo sie stworzyc ticketa. Sprawdz ID kategorii ticketow i uprawnienia bota.";

    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({ content: message }).catch(() => null);
    }

    return interaction.reply({ content: message, ephemeral: true }).catch(() => null);
  } finally {
    creatingTickets.delete(lockKey);
  }
}

function formatTicketAnswers(type, answers) {
  if (type === "zakup") {
    return [
      `> -Co chcesz kupic: **${answers.item || "Brak"}**`,
      `> -Budzet: **${answers.budget || "Brak"}**`,
      `> -Platnosc: **${answers.payment || "Brak"}**`,
    ].join("\n");
  }

  if (type === "index") {
    return [
      `> -Jaka baze chcesz kupic: **${answers.base || "Brak"}**`,
      `> -Czym placisz: **${answers.payment || "Brak"}**`,
      `> -Co w zastaw: **${answers.deposit || "Brak"}**`,
    ].join("\n");
  }

  if (type === "skup") {
    return [
      `> -Co chcesz sprzedac: **${answers.item || "Brak"}**`,
      `> -Czym chcesz dostac kase: **${answers.payout || "Brak"}**`,
    ].join("\n");
  }

  if (type === "pomoc") {
    return `> -W czym mozemy ci pomoc: **${answers.help || "Brak"}**`;
  }

  if (type === "odbior-nagrody") {
    return [
      `> -Za co chcesz odebrac nagrode: **${answers.rewardReason || "Brak"}**`,
      `> -Jaka nagrode chcesz odebrac: **${answers.reward || "Brak"}**`,
    ].join("\n");
  }

  if (type === "scamers") {
    return [
      `> -ID scamera: **${answers.scammerId || "Brak"}**`,
      `> -Nazwa scamera: **${answers.scammerName || "Brak"}**`,
      `> -Opis na co oszukal: **${answers.scamDescription || "Brak"}**`,
    ].join("\n");
  }

  if (type === "middleman") {
    return [
      `> -ID osoby z którą chcesz się wymienić: **${answers.exchangeUserId || "Brak"}**`,
      `> -Nazwa osoby z którą chcesz się wymienić: **${answers.exchangeUserName || "Brak"}**`,
      `> -O co jest wymiana: **${answers.exchangeItem || "Brak"}**`,
    ].join("\n");
  }

  return `Opis sprawy:\n\`\`\`\n${answers.description || "Brak opisu"}\n\`\`\``;
}

function showTicketModal(interaction, type) {
  const label = SETTINGS.ticketTypes[type] || type;
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle(`Ticket - ${label}`.slice(0, 45));

  if (type === "zakup") {
    const itemInput = new TextInputBuilder()
      .setCustomId("ticket_item")
      .setLabel("Co chcesz kupic?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. Robux, Nitro, konto")
      .setRequired(true);

    const budgetInput = new TextInputBuilder()
      .setCustomId("ticket_budget")
      .setLabel("Jaki masz budzet?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. 20 zl")
      .setRequired(true);

    const paymentInput = new TextInputBuilder()
      .setCustomId("ticket_payment")
      .setLabel("Czym placisz?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. BLIK, PayPal, PSC")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(itemInput),
      new ActionRowBuilder().addComponents(budgetInput),
      new ActionRowBuilder().addComponents(paymentInput)
    );

    return interaction.showModal(modal);
  }

  if (type === "index") {
    const baseInput = new TextInputBuilder()
      .setCustomId("ticket_base")
      .setLabel("Jaka baze chcesz kupic?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. aqua")
      .setRequired(true);

    const paymentInput = new TextInputBuilder()
      .setCustomId("ticket_base_payment")
      .setLabel("Czym placisz?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. BLIK, PayPal, PSC")
      .setRequired(true);

    const depositInput = new TextInputBuilder()
      .setCustomId("ticket_deposit")
      .setLabel("Co w zastaw?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. garama, 10zl")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(baseInput),
      new ActionRowBuilder().addComponents(paymentInput),
      new ActionRowBuilder().addComponents(depositInput)
    );

    return interaction.showModal(modal);
  }

  if (type === "skup") {
    const itemInput = new TextInputBuilder()
      .setCustomId("ticket_sell_item")
      .setLabel("Co chcesz sprzedac?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. brainrota")
      .setRequired(true);

    const payoutInput = new TextInputBuilder()
      .setCustomId("ticket_payout")
      .setLabel("Czym chcesz dostac kase?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. BLIK, PayPal, PSC")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(itemInput),
      new ActionRowBuilder().addComponents(payoutInput)
    );

    return interaction.showModal(modal);
  }

  if (type === "pomoc") {
    const helpInput = new TextInputBuilder()
      .setCustomId("ticket_help")
      .setLabel("W czym mozemy ci pomoc?")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Opisz, w czym mamy pomoc")
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(helpInput));

    return interaction.showModal(modal);
  }

  if (type === "odbior-nagrody") {
    const rewardReasonInput = new TextInputBuilder()
      .setCustomId("ticket_reward_reason")
      .setLabel("Za co chcesz odebrac nagrode?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. giveaway")
      .setRequired(true);

    const rewardInput = new TextInputBuilder()
      .setCustomId("ticket_reward")
      .setLabel("Jaka nagrode chcesz odebrac?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. Robux, Nitro, PSC")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(rewardReasonInput),
      new ActionRowBuilder().addComponents(rewardInput)
    );

    return interaction.showModal(modal);
  }

  if (type === "middleman") {
    const userIdInput = new TextInputBuilder()
      .setCustomId("ticket_exchange_user_id")
      .setLabel("ID osoby z którą chcesz się wymienić")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. 123456789012345678")
      .setRequired(true);

    const userNameInput = new TextInputBuilder()
      .setCustomId("ticket_exchange_user_name")
      .setLabel("Nazwa osoby z którą chcesz się wymienić")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. nick / nazwa Discord")
      .setRequired(true);

    const itemInput = new TextInputBuilder()
      .setCustomId("ticket_exchange_item")
      .setLabel("O co jest wymiana?")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("np. ja daje Robux, on daje PSC")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(userIdInput),
      new ActionRowBuilder().addComponents(userNameInput),
      new ActionRowBuilder().addComponents(itemInput)
    );

    return interaction.showModal(modal);
  }

  if (type === "scamers") {
    const scammerIdInput = new TextInputBuilder()
      .setCustomId("ticket_scammer_id")
      .setLabel("ID scamera")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. 123456789012345678")
      .setRequired(true);

    const scammerNameInput = new TextInputBuilder()
      .setCustomId("ticket_scammer_name")
      .setLabel("Nazwa scamera")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("np. nick / nazwa Discord")
      .setRequired(true);

    const scamDescriptionInput = new TextInputBuilder()
      .setCustomId("ticket_scam_description")
      .setLabel("Opis na co oszukal")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Opisz dokladnie, na co oszukal")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(scammerIdInput),
      new ActionRowBuilder().addComponents(scammerNameInput),
      new ActionRowBuilder().addComponents(scamDescriptionInput)
    );

    return interaction.showModal(modal);
  }

  const descriptionInput = new TextInputBuilder()
    .setCustomId("ticket_description")
    .setLabel("Opis sprawy")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Opisz dokladnie, czego dotyczy ticket")
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(descriptionInput));
  return interaction.showModal(modal);
}

async function ticketPanelPayload(guild) {
  const entries = Object.entries(SETTINGS.ticketTypes || {});

  if (entries.length === 0) {
    return null;
  }

  const options = await Promise.all(
    entries.slice(0, 25).map(([value, label]) => ticketOption(guild, value, label))
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_select")
    .setPlaceholder("❌ × Nie wybrano żadnej kategorii")
    .addOptions(options);

  return {
    embeds: [ticketPanelEmbed(), ...ticketPanelSmallImageEmbeds()],
    components: [new ActionRowBuilder().addComponents(menu)],
  };
}

function verificationPanelPayload(guild) {
  const verifyButton = new ButtonBuilder()
    .setCustomId("verify")
    .setLabel("Zweryfikuj się")
    .setStyle(ButtonStyle.Success);

  return {
    embeds: [verificationPanelEmbed(guild)],
    components: [new ActionRowBuilder().addComponents(verifyButton)],
  };
}

const commands = [
  new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Tworzy giveaway")
    .addStringOption((option) =>
      option.setName("nagroda").setDescription("Nagroda").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("czas")
        .setDescription("Czas, np. 10m, 2h, 1d")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("opis")
        .setDescription("Opis konkursu")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("wygrani")
        .setDescription("Liczba zwyciezcow")
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("tickets")
    .setDescription("Wysyla panel ticketow"),
  new SlashCommandBuilder()
    .setName("weryfikacja")
    .setDescription("Wysyla panel weryfikacji"),
  new SlashCommandBuilder()
    .setName("sticky")
    .setDescription("Ustawia sticky message na tym kanale")
    .addStringOption((option) =>
      option.setName("tekst").setDescription("Tekst sticky").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("sticky-off")
    .setDescription("Wylacza sticky message na tym kanale"),
  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Usuwa podana liczbe wiadomosci z kanalu")
    .addIntegerOption((option) =>
      option
        .setName("liczba")
        .setDescription("Ile wiadomosci usunac")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Dodaje osobe do aktualnego ticketa")
    .addUserOption((option) =>
      option.setName("osoba").setDescription("Kogo dodac do ticketa").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("reroll")
    .setDescription("Losuje ponownie ostatni zakonczony giveaway"),
  new SlashCommandBuilder()
    .setName("lc")
    .setDescription("Wysyla gotowa wiadomosc +rep")
    .addStringOption((option) =>
      option.setName("co").setDescription("Co kupiles/sprzedales").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("cena").setDescription("Jaka cena").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("metoda").setDescription("Jaka metoda platnosci").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Wycisza uzytkownika na podany czas")
    .addUserOption((option) =>
      option.setName("uzytkownik").setDescription("Kogo wyciszyc").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("czas").setDescription("Czas, np. 10m, 2h, 1d").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("powod").setDescription("Powod wyciszenia").setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Wyrzuca uzytkownika z serwera")
    .addUserOption((option) =>
      option.setName("uzytkownik").setDescription("Kogo wyrzucic").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("powod").setDescription("Powod wyrzucenia").setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banuje uzytkownika")
    .addUserOption((option) =>
      option.setName("uzytkownik").setDescription("Kogo zbanowac").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("powod").setDescription("Powod bana").setRequired(false)
    ),
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.User, Partials.GuildMember, Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once("clientReady", async () => {
  console.log(`Zalogowano jako ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: BRAND, type: ActivityType.Watching }],
    status: "online",
  });

  if (process.env.GUILD_ID) {
    const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
    await guild?.commands.set(commands.map((command) => command.toJSON()));
    console.log("Komendy serwerowe zarejestrowane.");
  }
});

client.on("guildMemberAdd", async (member) => {
  for (const roleId of SETTINGS.joinRoleIds || []) {
    await member.roles.add(roleId).catch((error) => {
      console.error(`Nie udalo sie nadac roli startowej ${roleId}:`, error);
    });
  }

  if (!SETTINGS.welcomeChannelId) return;

  const channel = await member.guild.channels.fetch(SETTINGS.welcomeChannelId).catch(() => null);
  if (!channel) return;

  const joinedAt = Math.floor((member.joinedTimestamp || Date.now()) / 1000);

  await channel.send({
    content: `${member}`,
    allowedMentions: { users: [member.id] },
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR)
        .setDescription(
          [
            "```",
            `**``👋  ${SETTINGS.shopName} × WITAMY``**`,
            "```",
            "> `🤝` **× Dzięki za dołączenie na serwer**",
            `> **${SETTINGS.shopName}**`,
            `> \`⏳\` **× Dołączono na serwer <t:${joinedAt}:R>**`,
            `> \`👥\` **× Aktualnie jest nas łącznie: \`${member.guild.memberCount}\` osób!**`,
          ].join("\n")
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 })),
    ],
  });
});

client.on("guildMemberRemove", async (member) => {
  if (!SETTINGS.leaveChannelId) return;

  const channel = await member.guild.channels.fetch(SETTINGS.leaveChannelId).catch(() => null);
  if (!channel) {
    console.error(`Nie znaleziono kanalu pozegnan: ${SETTINGS.leaveChannelId}`);
    return;
  }

  await channel.send({
    embeds: [
      baseEmbed(
        `${BRAND} x ODLOTY`,
        `**${member.user.tag}** opuscil serwer.\nZostalo nas **${member.guild.memberCount}**.`
      ).setThumbnail(member.user.displayAvatarURL({ size: 256 })),
    ],
  }).catch((error) => {
    console.error("Nie udalo sie wyslac pozegnania:", error);
  });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const command = message.content.trim().toLowerCase();

  if (command === "!hxw1" || command === "!hxw2" || command === "!hxw3") {
    if (!isAdmin(message.member)) {
      await message.reply("Tylko administrator moze uzyc tej komendy.").catch(() => null);
      return;
    }

    if (command === "!hxw1") {
      const payload = await ticketPanelPayload(message.guild);

      if (!payload) {
        await message.reply("Brakuje kategorii ticketow w SETTINGS.ticketTypes.").catch(() => null);
        return;
      }

      await message.channel.send(payload).catch((error) => {
        console.error("Blad panelu ticketow:", error);
        return message.reply("Nie udalo sie wyslac panelu ticketow. Sprawdz konsole bota.").catch(() => null);
      });
      return;
    }

    if (command === "!hxw3") {
      const legitMessage = await message.channel.send({
        embeds: [legitPanelEmbed()],
      }).catch((error) => {
        console.error("Blad panelu legit:", error);
        return null;
      });

      if (!legitMessage) {
        await message.reply("Nie udalo sie wyslac panelu legit. Sprawdz konsole bota.").catch(() => null);
        return;
      }

      await legitMessage.react(SETTINGS.legitEmojis.yes).catch((error) => {
        console.error("Nie udalo sie dodac reakcji TAK:", error);
      });
      await legitMessage.react(SETTINGS.legitEmojis.no).catch((error) => {
        console.error("Nie udalo sie dodac reakcji NIE:", error);
      });
      return;
    }

    await message.channel.send(verificationPanelPayload(message.guild)).catch((error) => {
      console.error("Blad panelu weryfikacji:", error);
      return message.reply("Nie udalo sie wyslac panelu weryfikacji. Sprawdz konsole bota.").catch(() => null);
    });
    return;
  }

  if (await handleAntiSpam(message)) {
    return;
  }

  if (
    SETTINGS.antiLinkEnabled &&
    (hasBlockedLink(message.content) || hasBlockedGif(message)) &&
    !canBypassAntiLink(message.member)
  ) {
    await message.delete().catch(() => null);

    if (message.member?.moderatable) {
      await message.member.timeout(
        SETTINGS.antiLinkMuteMs,
        "Antylink/antygif: wyslanie zablokowanej tresci"
      ).catch((error) => {
        console.error("Nie udalo sie nadac timeoutu za antylink/antygif:", error);
      });
    }

    const warning = await message.channel.send({
      content: `${message.author}, nie wysyłaj linków.`,
    });

    setTimeout(() => warning.delete().catch(() => null), 5000);
    return;
  }

  await sendSticky(message.channel);
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);

  const roleId = SETTINGS.reactionRoles[reaction.message.id]?.[normalizeEmoji(reaction)];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  await member?.roles.add(roleId).catch(() => null);
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);

  const roleId = SETTINGS.reactionRoles[reaction.message.id]?.[normalizeEmoji(reaction)];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  await member?.roles.remove(roleId).catch(() => null);
});

client.on("interactionCreate", async (interaction) => {
  try {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "lc") {
      const item = interaction.options.getString("co");
      const price = interaction.options.getString("cena");
      const paymentMethod = interaction.options.getString("metoda");

      return interaction.reply({
        content: `+rep ${interaction.user} ${item} ${price} [${paymentMethod}]`,
        allowedMentions: { users: [interaction.user.id] },
      });
    }

    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: "Tylko administrator moze uzyc tej komendy.",
        ephemeral: true,
      });
    }

    if (interaction.commandName === "tickets") {
      const payload = await ticketPanelPayload(interaction.guild);

      if (!payload) {
        return interaction.reply({
          content: "Brakuje kategorii ticketow w SETTINGS.ticketTypes.",
          ephemeral: true,
        });
      }

      return interaction.reply(payload);
    }

    if (interaction.commandName === "weryfikacja") {
      return interaction.reply(verificationPanelPayload(interaction.guild));
    }

    if (interaction.commandName === "giveaway") {
      const prize = interaction.options.getString("nagroda");
      const durationInput = interaction.options.getString("czas");
      const duration = parseDuration(durationInput);
      const description = interaction.options.getString("opis") || "Brak";
      const winners = interaction.options.getInteger("wygrani") || 1;

      if (!duration) {
        return interaction.reply({
          content: "Podaj czas w formacie np. 10m, 2h albo 1d.",
          ephemeral: true,
        });
      }

      const giveawayId = `${Date.now()}`;
      const endsAt = Math.floor((Date.now() + duration) / 1000);
      const giveaway = {
        prize,
        description,
        durationText: formatDuration(durationInput),
        endsAt,
        channelId: interaction.channelId,
        messageId: "",
        winners,
        members: new Set(),
      };
      const button = new ButtonBuilder()
        .setCustomId(`giveaway_join_${giveawayId}`)
        .setLabel("Wez udzial")
        .setStyle(ButtonStyle.Primary);

      await interaction.reply({
        embeds: [giveawayEmbed(giveaway, interaction.guild)],
        components: [new ActionRowBuilder().addComponents(button)],
      });

      const message = await interaction.fetchReply();
      giveaway.messageId = message.id;
      giveaways.set(giveawayId, giveaway);
      startGiveawayTimer(giveawayId);

      setTimeout(() => endGiveaway(giveawayId), duration);
      return;
    }


    if (interaction.commandName === "sticky") {
      const text = interaction.options.getString("tekst");
      config.stickyMessages[interaction.channelId] = {
        text,
        lastMessageId: "",
      };
      saveConfig();

      await interaction.reply({
        content: "Sticky message ustawiony.",
        ephemeral: true,
      });

      await sendSticky(interaction.channel);
      return;
    }

    if (interaction.commandName === "sticky-off") {
      const sticky = config.stickyMessages[interaction.channelId];

      if (sticky?.lastMessageId) {
        const oldMessage = await interaction.channel.messages
          .fetch(sticky.lastMessageId)
          .catch(() => null);
        await oldMessage?.delete().catch(() => null);
      }

      delete config.stickyMessages[interaction.channelId];
      saveConfig();

      return interaction.reply({
        content: "Sticky message wylaczony na tym kanale.",
        ephemeral: true,
      });
    }

    if (interaction.commandName === "clear") {
      const amount = interaction.options.getInteger("liczba");

      if (!interaction.channel?.bulkDelete) {
        return interaction.reply({
          content: "Tej komendy mozna uzyc tylko na kanale tekstowym.",
          ephemeral: true,
        });
      }

      if (
        !interaction.guild.members.me.permissionsIn(interaction.channel).has(
          PermissionsBitField.Flags.ManageMessages
        )
      ) {
        return interaction.reply({
          content: "Nie mam uprawnienia Zarzadzanie wiadomosciami na tym kanale.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });
      const deleted = await interaction.channel.bulkDelete(amount, true);

      return interaction.editReply({
        content: `Usunieto ${deleted.size} wiadomosci.`,
      });
    }

    if (interaction.commandName === "add") {
      if (!isTicketChannel(interaction.channel)) {
        return interaction.reply({
          content: "Tej komendy mozna uzyc tylko na tickecie.",
          ephemeral: true,
        });
      }

      const user = interaction.options.getUser("osoba");

      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      return interaction.reply({
        content: `${user} zostal dodany do ticketa.`,
        allowedMentions: { users: [user.id] },
      });
    }

    if (interaction.commandName === "reroll") {
      if (!lastEndedGiveaway) {
        return interaction.reply({
          content: "Nie ma jeszcze zakonczonego giveawayu do rerolla.",
          ephemeral: true,
        });
      }

      if (lastEndedGiveaway.members.size === 0) {
        return interaction.reply({
          content: `Ostatni giveaway **${lastEndedGiveaway.prize}** nie mial uczestnikow.`,
          ephemeral: true,
        });
      }

      const previousWinners = new Set(lastEndedGiveaway.lastWinners || []);
      let participants = Array.from(lastEndedGiveaway.members).filter(
        (memberId) => !previousWinners.has(memberId)
      );

      if (participants.length === 0) {
        participants = Array.from(lastEndedGiveaway.members);
      }

      participants.sort(() => Math.random() - 0.5);

      const winners = participants.slice(
        0,
        Math.min(lastEndedGiveaway.winners, participants.length)
      );
      lastEndedGiveaway.lastWinners = winners;

      const winnerText = winners.map((winnerId) => `<@${winnerId}>`).join(", ");

      return interaction.reply({
        content: `Reroll giveaway **${lastEndedGiveaway.prize}**. Wygrywa: ${winnerText}!`,
      });
    }

    if (interaction.commandName === "mute") {
      const user = interaction.options.getUser("uzytkownik");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const durationInput = interaction.options.getString("czas");
      const duration = parseDuration(durationInput);
      const reason = interaction.options.getString("powod") || "Brak powodu";

      if (!member) return interaction.reply({ content: "Nie znaleziono tego uzytkownika na serwerze.", ephemeral: true });
      if (!duration) return interaction.reply({ content: "Podaj czas w formacie np. 10m, 2h albo 1d.", ephemeral: true });
      if (!member.moderatable) return interaction.reply({ content: "Nie moge wyciszyc tej osoby. Sprawdz role bota.", ephemeral: true });

      await member.timeout(duration, reason);
      return interaction.reply({ content: `${member} zostal wyciszony na ${formatDuration(durationInput)}. Powod: ${reason}` });
    }

    if (interaction.commandName === "kick") {
      const user = interaction.options.getUser("uzytkownik");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const reason = interaction.options.getString("powod") || "Brak powodu";

      if (!member) return interaction.reply({ content: "Nie znaleziono tego uzytkownika na serwerze.", ephemeral: true });
      if (!member.kickable) return interaction.reply({ content: "Nie moge wyrzucic tej osoby. Sprawdz role bota.", ephemeral: true });

      await member.kick(reason);
      return interaction.reply({ content: `${user.tag} zostal wyrzucony. Powod: ${reason}` });
    }

    if (interaction.commandName === "ban") {
      const user = interaction.options.getUser("uzytkownik");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const reason = interaction.options.getString("powod") || "Brak powodu";

      if (member && !member.bannable) return interaction.reply({ content: "Nie moge zbanowac tej osoby. Sprawdz role bota.", ephemeral: true });

      await interaction.guild.members.ban(user.id, { reason });
      return interaction.reply({ content: `${user.tag} zostal zbanowany. Powod: ${reason}` });
    }
  }


  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
    return showTicketModal(interaction, interaction.values[0]);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal_")) {
    const type = interaction.customId.replace("ticket_modal_", "");

    if (type === "zakup") {
      return createTicket(interaction, type, {
        item: interaction.fields.getTextInputValue("ticket_item"),
        budget: interaction.fields.getTextInputValue("ticket_budget"),
        payment: interaction.fields.getTextInputValue("ticket_payment"),
      });
    }

    if (type === "index") {
      return createTicket(interaction, type, {
        base: interaction.fields.getTextInputValue("ticket_base"),
        payment: interaction.fields.getTextInputValue("ticket_base_payment"),
        deposit: interaction.fields.getTextInputValue("ticket_deposit"),
      });
    }

    if (type === "skup") {
      return createTicket(interaction, type, {
        item: interaction.fields.getTextInputValue("ticket_sell_item"),
        payout: interaction.fields.getTextInputValue("ticket_payout"),
      });
    }

    if (type === "pomoc") {
      return createTicket(interaction, type, {
        help: interaction.fields.getTextInputValue("ticket_help"),
      });
    }

    if (type === "odbior-nagrody") {
      return createTicket(interaction, type, {
        rewardReason: interaction.fields.getTextInputValue("ticket_reward_reason"),
        reward: interaction.fields.getTextInputValue("ticket_reward"),
      });
    }

    if (type === "scamers") {
      return createTicket(interaction, type, {
        scammerId: interaction.fields.getTextInputValue("ticket_scammer_id"),
        scammerName: interaction.fields.getTextInputValue("ticket_scammer_name"),
        scamDescription: interaction.fields.getTextInputValue("ticket_scam_description"),
      });
    }

    if (type === "middleman") {
      return createTicket(interaction, type, {
        exchangeUserId: interaction.fields.getTextInputValue("ticket_exchange_user_id"),
        exchangeUserName: interaction.fields.getTextInputValue("ticket_exchange_user_name"),
        exchangeItem: interaction.fields.getTextInputValue("ticket_exchange_item"),
      });
    }

    return createTicket(interaction, type, {
      description: interaction.fields.getTextInputValue("ticket_description"),
    });
  }

  if (interaction.isButton() && interaction.customId.startsWith("giveaway_join_")) {
    const giveawayId = interaction.customId.replace("giveaway_join_", "");
    const giveaway = giveaways.get(giveawayId);

    if (!giveaway) {
      return interaction.reply({
        content: "Ten giveaway juz sie zakonczyl.",
        ephemeral: true,
      });
    }

    if (giveaway.members.has(interaction.user.id)) {
      return interaction.reply({
        content: "Juz bierzesz udzial w tym giveawayu.",
        ephemeral: true,
      });
    }

    giveaway.members.add(interaction.user.id);

    const message = await interaction.message.fetch().catch(() => null);
    if (message) {
      await message.edit({
        embeds: [giveawayEmbed(giveaway, interaction.guild)],
      }).catch(() => null);
    }

    return interaction.reply({
      content: `Dolaczyles do giveawayu o **${giveaway.prize}**.`,
      ephemeral: true,
    });
  }

  if (interaction.isButton() && interaction.customId === "ticket_close") {
    if (!isTicketChannel(interaction.channel)) {
      return interaction.reply({
        content: "To nie jest ticket.",
        ephemeral: true,
      });
    }

    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: "Tylko administrator moze zamknac ticketa.",
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: "Ticket zostanie zamkniety za 3 sekundy...",
      ephemeral: true,
    });

    setTimeout(() => interaction.channel.delete().catch(() => null), 3000);
  }

  if (interaction.isButton() && interaction.customId === "ticket_claim") {
    if (!isTicketChannel(interaction.channel)) {
      return interaction.reply({
        content: "To nie jest ticket.",
        ephemeral: true,
      });
    }

    const ticketType = ticketTypeFromChannel(interaction.channel);
    const accessRoleIds = ticketAccessRoleIds(ticketType);

    if (
      !isAdmin(interaction.member) &&
      !accessRoleIds.some((roleId) => interaction.member.roles.cache.has(roleId))
    ) {
      return interaction.reply({
        content: "Nie masz uprawnien do przejecia tego ticketa.",
        ephemeral: true,
      });
    }

    if (interaction.channel.topic?.includes("Claimed by:")) {
      return interaction.reply({
        content: "Ten ticket jest juz przejety.",
        ephemeral: true,
      });
    }

    await interaction.channel.setTopic(
      `${interaction.channel.topic || ""} | Claimed by: ${interaction.user.id}`
    );

    return interaction.reply({
      embeds: [
        baseEmbed(
          `${BRAND} x TICKETY`,
          `Ticket zostal przejety przez ${interaction.user}.`
        ),
      ],
    });
  }

  if (interaction.isButton() && interaction.customId === "verify") {
    const roleIds = SETTINGS.verifyRoleIds.filter(
      (roleId) => roleId && !roleId.includes("TU_WPISZ")
    );

    if (roleIds.length === 0) {
      return interaction.reply({
        content: "Brakuje ID roli weryfikacji w SETTINGS.verifyRoleIds.",
        ephemeral: true,
      });
    }

    const roles = [];

    for (const roleId of roleIds) {
      const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
      if (role) roles.push(role);
    }

    if (roles.length !== roleIds.length) {
      return interaction.reply({
        content:
          "Nie znaleziono jednej z ról weryfikacyjnych. Sprawdź ID ról i czy bot jest na dobrym serwerze.",
        ephemeral: true,
      });
    }

    const alreadyVerified = roles.every((role) => interaction.member.roles.cache.has(role.id));

    if (alreadyVerified) {
      return interaction.reply({
        content: "Zweryfikowałeś się.",
        ephemeral: true,
      });
    }

    const addedRoles = await interaction.member.roles.add(roles).catch(() => null);

    if (!addedRoles) {
      return interaction.reply({
        content: "Nie udało się nadać ról weryfikacyjnych. Sprawdź uprawnienia i pozycję roli bota.",
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: "Zostałeś zweryfikowany!",
      ephemeral: true,
    });
  }
  } catch (error) {
    console.error("Blad obslugi interakcji:", error);

    const response = {
      content: "Cos poszlo nie tak przy obsludze tej akcji. Sprawdz konsole bota.",
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(response).catch(() => null);
    } else {
      await interaction.reply(response).catch(() => null);
    }
  }
});

process.on("unhandledRejection", (error) => {
  console.error("Nieobsluzony blad promise:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Nieobsluzony blad:", error);
});

async function startBot() {
  if (!process.env.TOKEN) {
    console.error("Brakuje TOKEN w pliku .env.");
    process.exit(1);
  }

  await client.login(process.env.TOKEN);
}

if (require.main === module) {
  startBot().catch((error) => {
    console.error("Nie udalo sie uruchomic bota.");
    console.error(error);
    process.exit(1);
  });
}

module.exports = { commands };
