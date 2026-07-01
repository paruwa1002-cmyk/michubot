require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
  ActionRowBuilder,
  ActivityType,
  AttachmentBuilder,
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
const BRAND = "Mnichu Shop | 7 zapro = garama";
const COLOR = "#00FFFF";
const giveaways = new Map();
const giveawayTimers = new Map();
let lastEndedGiveaway = null;
const stickyCooldowns = new Set();
const creatingTickets = new Set();
const spamTracker = new Map();
const MYSTERY_ACCOUNT_OPTIONS = [
  { label: "Basic", value: "basic", description: "Konto Basic - 30 zl" },
  { label: "Advanced", value: "advanced", description: "Konto Advanced - 50 zl" },
  { label: "Pro", value: "pro", description: "Konto Pro - 100 zl" },
  { label: "Legend", value: "legend", description: "Konto Legend - 300 zl" },
];

const SETTINGS = {
  shopName: "Mnichu Shop | 7 zapro = garama",
  ticketPanelImageUrl: "https://cdn.phototourl.com/free/2026-07-01-3d5c2e47-00a3-4dc6-87fa-d418eac97c19.png",
  accountsPanelImageUrl: "https://www.image2url.com/r2/default/images/1782924278832-02cc25a2-d1bc-4e79-983f-2aba41644ba0.png",
  welcomeChannelId: "1492219297068744861",
  leaveChannelId: "1506358859181326397",
  ticketLogChannelId: "1492219297068744854",
  verifyRoleIds: [
    "1503692092457881602",
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
  giveawayCommandRoleIds: ["1492219296208785644"],
  ticketCategoryId: "1492219297915994215",
  ticketCategoryIds: {
    zakup: "1510552049941610586",
    "index": "1510552124029669516",
    skup: "1512030112588238958",
    "middleman": "1512030060008177665",
    pomoc: "1511846773117681765",
    "odbior-nagrody": "1512029966026543256",
    scamers: "1512029921478971442",
    partnerstwa: "1513578922019918085",
    mystery_konta: "1521934648098160831",
  },
  ticketSupportRoleIds: ["1492219296208785645",
"1492219296208785646",
"1503701315363143742",
"1492219296208785647",
"1505829696003379290",
"1492219296208785644",
"1492219296208785644",
  ],
  ticketCategoryRoleIds: {
    
    pomoc: ["1492219296208785645",
"1492219296208785646",
"1503701315363143742",
"1492219296208785647",
"1505829696003379290",
"1492219296208785644",
],
  },
  ticketTypes: {
    zakup: "Zakup",
    "index": "index",
    skup: "Skup",
    "middleman": "Middleman",
    pomoc: "Pomoc",
    "odbior-nagrody": "Odbiór nagrody",
    "mystery-konta": "Mystery konta",
    scamers: "Scamers",
    partnerstwa: "Partnerstwa"
  },
  ticketEmojis: {
    zakup: "<:wozek:1510346111368302813>",
    "index": "<:dom:1510580079447638147>",
    skup: "<:worek:1510536925851816067>",
    "middleman": "<:tarcza:1510540379165032538>",
    pomoc: "<:pytanie:1510345968992911561>",
    "odbior-nagrody": "<:prezent:1510580597091864719>",
    "mystery-konta": "<:mystery:1521933905014427768>",
    scamers: "<:klaun:1510537174045687869>",
    partnerstwa: "<:ludzie:1510345875296227390>"
  },
  reactionRoles: {
    // "ID_WIADOMOSCI": {
    //   "EMOJI_ALBO_ID_EMOJI": "ID_ROLI"
    // }
  },
  pingRoleOptions: [
    { label: "ping konkursy", emoji: "<:prezent:1510580597091864719>", roleId: "1503804350357831730" },
    { label: "ping restock", emoji: "<:wozek:1510346111368302813>", roleId: "1503804447208505494" },
    { label: "ping okazja", emoji: "<:worek:1510536925851816067>", roleId: "1503804398542000158" },
    { label: "ping ogłoszenia", emoji: "<:dzwonek:1510345801573072946>", roleId: "1507848122108346558" },
    { label: "ping live", emoji: "<:zegar:1510346125650165861>", roleId: "1503804513331445900" },
  ],
};

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return {
      stickyMessages: {},
      reactionRoles: {},
    };
  }

  const loaded = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  return {
    stickyMessages: loaded.stickyMessages || {},
    reactionRoles: loaded.reactionRoles || {},
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
        `📩  ${SETTINGS.shopName} × STWÓRZ TICKET`,
        "```",
        "> 📩 × **Wybierz odpowiednią kategorię, aby utworzyć ticketa!**",
      ].join("\n")
    );

  if (SETTINGS.ticketPanelImageUrl) {
    embed.setImage(SETTINGS.ticketPanelImageUrl);
  }

  return embed;
}

function ticketPanelSmallImageEmbeds() {
  return (SETTINGS.ticketPanelSmallImageUrls || [])
    .filter(Boolean)
    .slice(0, 2)
    .map((imageUrl) => new EmbedBuilder().setColor(COLOR).setThumbnail(imageUrl));
}


function verificationPanelEmbed(guild) {
  return new EmbedBuilder()
    .setColor("#00FFFF")
    .setDescription(
      [
        "```",
        `✅ ${SETTINGS.shopName} × WERYFIKACJA`,
        "```",
        "",
        "・Aby mieć **całkowity dostęp** do serwera, **zweryfikuj się**",
        "klikając przycisk poniżej!",
        "",
        "<a:tak:1517757067568615535> Dziękujemy za zaufanie!",
        `・Zespół **${SETTINGS.shopName}**`,
      ].join("\n")
    )
    .setImage(SETTINGS.ticketPanelImageUrl)
    .setFooter({
      text: `© 2026 | ${SETTINGS.shopName}`,
      iconURL: guild.iconURL({ dynamic: true }),
    });
}

function isAdmin(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

function hasAnyRole(member, roleIds) {
  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

function canUseGiveawayCommand(member) {
  return isAdmin(member) || hasAnyRole(member, SETTINGS.giveawayCommandRoleIds);
}

function canUseTicketCommand(member, type) {
  return isAdmin(member) || hasAnyRole(member, ticketAccessRoleIds(type));
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

function ticketOwnerIdFromChannel(channel) {
  return channel?.topic?.match(/User:\s*(\d+)/)?.[1] || null;
}

function ticketClaimedByIdFromChannel(channel) {
  return channel?.topic?.match(/Claimed by:\s*(\d+)/)?.[1] || null;
}

function ticketAccessRoleIds(type) {
  return [
    ...(SETTINGS.ticketSupportRoleIds || []),
    ...(SETTINGS.ticketCategoryRoleIds?.[type] || []),
  ].filter(Boolean);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchAllChannelMessages(channel) {
  const messages = [];
  let before;

  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, before }).catch((error) => {
      console.error("Nie udalo sie pobrac wiadomosci do transcriptu:", error);
      return null;
    });

    if (!fetched?.size) break;

    messages.push(...fetched.values());
    before = fetched.last().id;

    if (fetched.size < 100) break;
  }

  return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function buildTicketTranscriptHtml(channel, messages, closedBy) {
  const generatedAt = new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
  const rows = messages.map((message) => {
    const attachments = message.attachments.map((attachment) => {
      const safeName = escapeHtml(attachment.name || attachment.url);
      const safeUrl = escapeHtml(attachment.url);
      return `<li><a href="${safeUrl}" target="_blank" rel="noreferrer">${safeName}</a></li>`;
    }).join("");

    const embeds = message.embeds.map((embed) => {
      const title = embed.title ? `<strong>${escapeHtml(embed.title)}</strong>` : "";
      const description = embed.description ? `<p>${escapeHtml(embed.description).replace(/\n/g, "<br>")}</p>` : "";
      const fields = (embed.fields || []).map(
        (field) => `<p><strong>${escapeHtml(field.name)}</strong><br>${escapeHtml(field.value).replace(/\n/g, "<br>")}</p>`
      ).join("");
      return `<div class="embed">${title}${description}${fields}</div>`;
    }).join("");

    return `
      <article class="message">
        <img class="avatar" src="${escapeHtml(message.author.displayAvatarURL({ size: 64 }))}" alt="">
        <div class="body">
          <div class="meta">
            <span class="author">${escapeHtml(message.author.tag)}</span>
            <span class="date">${escapeHtml(new Date(message.createdTimestamp).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" }))}</span>
          </div>
          <div class="content">${escapeHtml(message.content || "").replace(/\n/g, "<br>") || "<em>Brak treści</em>"}</div>
          ${attachments ? `<ul class="attachments">${attachments}</ul>` : ""}
          ${embeds}
        </div>
      </article>`;
  }).join("\n");

  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Historia ticketa - ${escapeHtml(channel.name)}</title>
  <style>
    body { margin: 0; background: #111214; color: #e7e9ed; font-family: Arial, sans-serif; }
    header { padding: 28px; background: #1e1f22; border-bottom: 4px solid #00ffff; }
    h1 { margin: 0 0 8px; font-size: 26px; }
    .summary { color: #b5bac1; line-height: 1.5; }
    main { max-width: 980px; margin: 0 auto; padding: 24px; }
    .message { display: flex; gap: 14px; padding: 16px 0; border-bottom: 1px solid #2b2d31; }
    .avatar { width: 42px; height: 42px; border-radius: 50%; flex: 0 0 auto; }
    .body { min-width: 0; flex: 1; }
    .meta { margin-bottom: 6px; }
    .author { font-weight: 700; color: #ffffff; }
    .date { color: #949ba4; font-size: 13px; margin-left: 8px; }
    .content { white-space: normal; line-height: 1.45; }
    .attachments { margin: 8px 0 0; padding-left: 20px; }
    a { color: #00ffff; }
    .embed { margin-top: 10px; padding: 12px; border-left: 4px solid #00ffff; background: #1e1f22; border-radius: 6px; }
    em { color: #949ba4; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(SETTINGS.shopName)} - historia ticketa</h1>
    <div class="summary">
      Kanał: #${escapeHtml(channel.name)}<br>
      Zamknął: ${escapeHtml(closedBy.tag)} (${escapeHtml(closedBy.id)})<br>
      Wygenerowano: ${escapeHtml(generatedAt)}<br>
      Liczba wiadomości: ${messages.length}
    </div>
  </header>
  <main>${rows || "<p>Brak wiadomości w tickecie.</p>"}</main>
</body>
</html>`;
}

async function sendTicketTranscript(target, payload) {
  if (!target) return false;

  const file = new AttachmentBuilder(Buffer.from(payload.html, "utf8"), {
    name: payload.fileName,
  });

  return target.send({
    content: payload.content,
    embeds: payload.embeds || [],
    files: [file],
  }).then(() => true).catch((error) => {
    console.error(`Nie udalo sie wyslac transcriptu do ${target.id || target.name}:`, error);
    return false;
  });
}

function ticketClosedDmEmbed(channel, ticketType, closedBy) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setDescription(
      [
        "```",
        `💎  ${SETTINGS.shopName} × TWÓJ TICKET ZOSTAŁ ZAMKNIĘTY`,
        "```",
        "",
        `> » **Ticket:** \`${channel.name}\``,
        `> » **Kategoria:** \`${ticketType || "brak"}\``,
        `> » **Zamknięty przez:** <@${closedBy.id}>`,
        "",
        `💎 © 2026 ${SETTINGS.shopName} × Ticket`,
      ].join("\n")
    );
}

async function closeTicketWithTranscript(interaction) {
  const channel = interaction.channel;
  const ticketType = ticketTypeFromChannel(channel);
  const messages = await fetchAllChannelMessages(channel);
  const html = buildTicketTranscriptHtml(channel, messages, interaction.user);
  const fileName = `transcript-${channel.name}.html`.replace(/[^a-z0-9_.-]/gi, "-");
  const ownerId = ticketOwnerIdFromChannel(channel);
  const claimedById = ticketClaimedByIdFromChannel(channel);
  const logChannelId = process.env.TICKET_LOG_CHANNEL_ID || SETTINGS.ticketLogChannelId;

  const owner = ownerId ? await interaction.guild.members.fetch(ownerId).catch(() => null) : null;
  const claimedBy = claimedById ? await interaction.guild.members.fetch(claimedById).catch(() => null) : null;
  const logChannel = logChannelId ? await interaction.guild.channels.fetch(logChannelId).catch(() => null) : null;
  const baseContent = `Historia ticketa **#${channel.name}** zamkniętego przez ${interaction.user.tag}.`;
  const dmPayload = {
    html,
    fileName,
    content: `📨 **Transcript twojego ticketa \`${channel.name}\`**`,
    embeds: [ticketClosedDmEmbed(channel, ticketType, interaction.user)],
  };

  const payload = {
    html,
    fileName,
    content: baseContent,
  };

  await sendTicketTranscript(owner?.user, dmPayload);

  if (claimedBy?.id && claimedBy.id !== owner?.id) {
    await sendTicketTranscript(claimedBy.user, dmPayload);
  }

  if (logChannel?.isTextBased()) {
    await sendTicketTranscript(logChannel, {
      ...payload,
      content: `${baseContent}\nKlient: ${owner ? `${owner.user.tag} (${owner.id})` : "nie znaleziono"}\nPrzejął: ${claimedBy ? `${claimedBy.user.tag} (${claimedBy.id})` : "nikt"}`,
    });
  } else if (logChannelId) {
    console.error(`Nie znaleziono tekstowego kanalu logow ticketow: ${logChannelId}`);
  }
}

async function allowAttachmentsInExistingTickets(guild) {
  await guild.channels.fetch().catch(() => null);

  const ticketChannels = guild.channels.cache.filter(isTicketChannel);

  for (const channel of ticketChannels.values()) {
    for (const overwrite of channel.permissionOverwrites.cache.values()) {
      if (
        overwrite.allow.has(PermissionsBitField.Flags.SendMessages) &&
        !overwrite.allow.has(PermissionsBitField.Flags.AttachFiles)
      ) {
        await channel.permissionOverwrites
          .edit(overwrite.id, { AttachFiles: true })
          .catch((error) => console.error(`Nie udalo sie dodac zdjec na ${channel.name}:`, error));
      }
    }
  }
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
    .setTitle("`Mnichu Shop | 7 zapro = garama 👻 × KONKURS`")
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
      text: "Mnichu Shop | 7 zapro = garama  × KONKURSY",
      iconURL: guild.iconURL({ dynamic: true }),
    });
}

function normalizeEmoji(reaction) {
  return reaction.emoji.id || reaction.emoji.name;
}

function emojiKeyFromValue(emoji) {
  const match = String(emoji).match(/^<a?:[^:]+:(\d+)>$/);
  return match?.[1] || emoji;
}

function configuredPingRoles() {
  return (SETTINGS.pingRoleOptions || []).filter(
    (option) =>
      option.label &&
      option.emoji &&
      option.roleId &&
      !String(option.roleId).includes("TU_WPISZ")
  );
}

function isPingRolesMessage(message) {
  return (
    message?.author?.id === client.user.id &&
    message.embeds?.some((embed) => embed.description?.includes("wybierz pingi"))
  );
}

function roleIdForReaction(reaction) {
  const emoji = normalizeEmoji(reaction);
  const savedRoleId =
    config.reactionRoles?.[reaction.message.id]?.[emoji] ||
    SETTINGS.reactionRoles[reaction.message.id]?.[emoji];

  if (savedRoleId) return savedRoleId;

  if (!isPingRolesMessage(reaction.message)) return null;

  const option = configuredPingRoles().find(
    (pingRole) => emojiKeyFromValue(pingRole.emoji) === emoji
  );

  return option?.roleId || null;
}

function pingRolesEmbed(guild, options) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setDescription(
      [
        "``✉️ Mnichu Shop | 7 zapro = garama × wybierz pingi``",
        ...options.map((option) => `• **${option.label}** - ${option.emoji}`),
      ].join("\n")
    )
    .setFooter({
      text: `© 2026 ${SETTINGS.shopName}`,
      iconURL: guild.iconURL({ dynamic: true }),
    });
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
        channel.name.startsWith("ticket-")
    );

    if (existing) {
      return interaction.editReply({
        content: `Masz juz otwarty ticket: ${existing}. Zamknij go, zanim utworzysz kolejny.`,
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
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      },
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.AttachFiles,
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
          PermissionsBitField.Flags.AttachFiles,
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
          name: "-  <:ludzik:1510345890110509107> Informacje o uzytkowniku",
          value: [
            `> -Ping: ${interaction.user}`,
            `> -Nick: **${interaction.user.username}**`,
            `> -ID: \`${interaction.user.id}\``,
          ].join("\n"),
          inline: false,
        },
        {
          name: "-  <:regulamin:1510345987955233069> z Informacje z formularza",
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

  if (type === "mystery-konta") {
    return `> -Wybrane konto: **${answers.accountType || "Brak"}**`;
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

  if (type === "partnerstwa") {
  return [
    `> -Liczba osób na serwerze: **${answers.members || "Brak"}**`,
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
  if (type === "partnerstwa") {
  const membersInput = new TextInputBuilder()
    .setCustomId("ticket_members")
    .setLabel("Ile osób znajduje się na serwerze?")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("np. 500")
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(membersInput)
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
    .setEmoji("⭐")
    .setLabel("Zweryfikuj się!")
    .setStyle(ButtonStyle.Secondary);

  return {
    embeds: [verificationPanelEmbed(guild)],
    components: [new ActionRowBuilder().addComponents(verifyButton)],
  };
}

function rulesEmbed(guild) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setDescription(
      [
        "```",
        `📜 Regulamin Serwera ${SETTINGS.shopName}  👻`,
        "```",
        "",
        "» **1. POSTANOWIENIA OGÓLNE**",
        "1.1. Dołączając na serwer, akceptujesz niniejszy regulamin.",
        "1.2. Administracja ma prawo do interpretacji regulaminu oraz podejmowania decyzji niezależnie od jego zapisu, jeśli wymaga tego sytuacja.",
        "1.3. Nieznajomość regulaminu nie zwalnia z jego przestrzegania.",
        "",
        "» **2. ZACHOWANIE I KULTURA**",
        "2.1. Szanuj innych użytkowników - zakazane są wyzwiska, obrażanie, hejt i nękanie.",
        "2.2. Zabrania się promowania przemocy, dyskryminacji oraz mowy nienawiści.",
        "2.3. Kłótnie i dramy prosimy załatwiać prywatnie, nie na kanałach publicznych.",
        "2.4. Zakaz spamowania wiadomościami.",
        "",
        "» **3. TREŚCI NA SERWERZE**",
        "3.1. Zakaz publikowania treści NSFW, brutalnych, drastycznych, wulgarnych lub nieodpowiednich dla młodszych użytkowników.",
        "3.2. Zabronione jest publikowanie nielegalnych materiałów, pirackich plików, cracków i cheatów.",
        "3.3. Reklamowanie innych serwerów, stron lub usług jest dozwolone tylko w miejscach wyznaczonych przez administrację.",
        "",
        "» **4. BEZPIECZEŃSTWO**",
        "4.1. Podejrzane linki, wirusy, phishing lub próby oszustwa będą skutkować natychmiastowym banem.",
        "4.2. Podszywanie się pod innych użytkowników lub administrację jest zabronione.",
        "",
        "» **5. ADMINISTRACJA**",
        "5.1. Administracja ma prawo wydawać ostrzeżenia, mute, kick oraz ban według własnej oceny sytuacji.",
        "5.2. Nie dyskutujemy agresywnie z decyzjami administracji - można zgłosić odwołanie w odpowiednim kanale.",
        "5.3. Administracja nie jest zobowiązana do tłumaczenia każdej decyzji, jeśli naruszenie regulaminu jest oczywiste.",
        "",
        "» **6. POSTANOWIENIA KOŃCOWE**",
        "6.1. Regulamin może zostać w każdej chwili zaktualizowany.",
        "6.2. Kontynuując korzystanie z serwera, akceptujesz każdą wprowadzoną zmianę.",
        "6.3. Zakaz wyzywania administracji bez powodu.",
        "6.4. Zakaz proszenia o rangi.",
        "6.5. Jest nakaz robienia middlemana albo pójścia po moderatora. Jeśli ktoś odmawia, ma przerwę.",
      ].join("\n")
    )
    .setFooter({
      text: `© 2026 ${SETTINGS.shopName}`,
      iconURL: guild.iconURL({ dynamic: true }),
    });
}

function inviteRewardsEmbed(guild) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`<:emoji_1:1509921289320796362>${SETTINGS.shopName} Nagrody za zapro <:emoji_1:1509921289320796362>`)
    .setDescription(
      [
        "",
        "**4 zapro**",
        " <a:strzalka:1513889913106599946> brainrot 200m <a:6843bluecrown:1521893100501340171>",
        "",
        "**7 zapro**",
        " <a:strzalka:1513889913106599946> brainrot 50-200m <:garama:1513889125009199104> ",
        "",
        "*Można odebrać tylko jedną nagrodę, np. jak odbierzesz nagrodę za 4 zapro już nie będziesz mógł odebrać nagrody za 7.*",
        "`(osoba musi się zweryfikować)`",
        "",
        "> Odbiór nagrody: **<#1492219298481963209>**",
      ].join("\n")
    )
    .setThumbnail(SETTINGS.ticketPanelImageUrl)
    .setFooter({
      text: `© 2026 ${SETTINGS.shopName}`,
      iconURL: guild.iconURL({ dynamic: true }),
    });
}

function accountsEmbed(guild) {
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`<:emoji_1:1509921289320796362> ${SETTINGS.shopName} × Mystery konta Steal a Brainrot <:emoji_1:1509921289320796362>`)
    .setDescription(
      [

        "",
        "<:prezent:1510580597091864719> **KONTO BASIC - 30 zł**",
        "• Zarobek: **400M/s - 800M/s**",
        "• Losowa zawartość",
        "• ✅ **Gwarancja rzadkich brainrotów**",
        "",
        "<:prezent:1510580597091864719> **KONTO ADVANCED - 50 zł**",
        "• Zarobek: **800M/s - 1.3B/s**",
        "• Lepsze RNG niż Basic",
        "• 🧠 **Gwarantowana garamka!**",
        "",
        "<:prezent:1510580597091864719> **KONTO PRO - 100 zł**",
        "• Zarobek: **1.8B/s - 2.5B/s**",
        "• 🧠 **Gwarantowane rzadkie brainrot**",
        "• Bardzo mocna losowa zawartość",
        "",
        "<:prezent:1510580597091864719> **KONTO LEGEND - 300 zł**",
        "• Zarobek: **2.5B/s - 8B/s**",
        "• 🧠 **Bardzo dużo rzadkich brainrotów**",
        "• 🔥 Top-tier konto",
        "",
        "Robimy też mystery konta dopasowane pod Twój budżet!",
      ].join("\n")
    )
    .setFooter({
      text: `© 2026 ${SETTINGS.shopName}`,
      iconURL: guild.iconURL({ dynamic: true }),
    });

  if (SETTINGS.accountsPanelImageUrl) {
    embed.setImage(SETTINGS.accountsPanelImageUrl);
  }

  return embed;
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
  .setName("legit")
  .setDescription("Wysyła ankietę legit"),

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
    .setName("claim")
    .setDescription("Przejmuje aktualny ticket"),
  new SlashCommandBuilder()
    .setName("close")
    .setDescription("Zamyka aktualny ticket"),
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

    new SlashCommandBuilder()
  .setName("wiadomosc")
  .setDescription("Wysyła wiadomość przez bota")
  .addStringOption(option =>
    option
      .setName("co")
      .setDescription("Treść wiadomości")
      .setRequired(true)
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
    if (guild) await allowAttachmentsInExistingTickets(guild);
    console.log("Komendy serwerowe zarejestrowane.");
  }
});

client.on("guildMemberAdd", async (member) => {
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
            `**👋  ${SETTINGS.shopName} × WITAMY**`,
            "> `🤝` **× Dzięki za dołączenie na serwer**",
            `> **${SETTINGS.shopName}**`,
            `> \`⏳\` **× Dołączono na serwer <t:${joinedAt}:R>**`,
            `> \`👥\` **× Aktualnie jest nas łącznie: \`${member.guild.memberCount}\` osób!**`,
          ].join("\n")
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 })),
    ],
  }).catch((error) => {
    console.error("Nie udalo sie wyslac powitania:", error);
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
      new EmbedBuilder()
        .setColor(COLOR)
        .setDescription(
          [
            `**👋  ${SETTINGS.shopName} × POŻEGNANIA**`,
            "> `👋` **× Użytkownik opuścił serwer**",
            `> **${SETTINGS.shopName}**`,
            `> \`👤\` **× Opuścił nas: \`${member.user.tag}\`**`,
            `> \`👥\` **× Aktualnie jest nas łącznie: \`${member.guild.memberCount}\` osób!**`,
          ].join("\n")
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 })),
    ],
  }).catch((error) => {
    console.error("Nie udalo sie wyslac pozegnania:", error);
  });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const command = message.content.trim().toLowerCase();

  if (command === "!hxw1" || command === "!hxw2") {
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

    await message.channel.send(verificationPanelPayload(message.guild)).catch((error) => {
      console.error("Blad panelu weryfikacji:", error);
      return message.reply("Nie udalo sie wyslac panelu weryfikacji. Sprawdz konsole bota.").catch(() => null);
    });
    return;
  }

  if (command === "!regulamin") {
    if (!isAdmin(message.member)) {
      await message.reply("Tylko administrator moze uzyc tej komendy.").catch(() => null);
      return;
    }

    await message.channel.send({
      embeds: [rulesEmbed(message.guild)],
    }).catch((error) => {
      console.error("Blad panelu regulaminu:", error);
      return message.reply("Nie udalo sie wyslac regulaminu. Sprawdz konsole bota.").catch(() => null);
    });
    return;
  }

  if (command === "!zapro") {
    if (!isAdmin(message.member)) {
      await message.reply("Tylko administrator moze uzyc tej komendy.").catch(() => null);
      return;
    }

    await message.channel.send({
      embeds: [inviteRewardsEmbed(message.guild)],
    }).catch((error) => {
      console.error("Blad panelu nagrod za zapro:", error);
      return message.reply("Nie udalo sie wyslac nagrod za zapro. Sprawdz konsole bota.").catch(() => null);
    });
    return;
  }

  if (command === "!konta") {
    if (!isAdmin(message.member)) {
      await message.reply("Tylko administrator moze uzyc tej komendy.").catch(() => null);
      return;
    }

    await message.channel.send({
      embeds: [accountsEmbed(message.guild)],
    }).catch((error) => {
      console.error("Blad panelu kont:", error);
      return message.reply("Nie udalo sie wyslac panelu kont. Sprawdz konsole bota.").catch(() => null);
    });
    return;
  }

  if (command === "!pingi") {
    if (!isAdmin(message.member)) {
      await message.reply("Tylko administrator moze uzyc tej komendy.").catch(() => null);
      return;
    }

    const options = configuredPingRoles();
    if (options.length === 0) {
      await message.reply("Wpisz role i emotki w SETTINGS.pingRoleOptions, zanim wyslesz panel.").catch(() => null);
      return;
    }

    const panel = await message.channel.send({
      embeds: [pingRolesEmbed(message.guild, options)],
    }).catch((error) => {
      console.error("Blad panelu pingow:", error);
      return null;
    });

    if (!panel) {
      await message.reply("Nie udalo sie wyslac panelu pingow. Sprawdz konsole bota.").catch(() => null);
      return;
    }

    config.reactionRoles[panel.id] = {};

    for (const option of options) {
      await panel.react(option.emoji).catch((error) => {
        console.error(`Nie udalo sie dodac reakcji ${option.emoji}:`, error);
      });
      config.reactionRoles[panel.id][emojiKeyFromValue(option.emoji)] = option.roleId;
    }

    saveConfig();
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
  if (reaction.message?.partial) await reaction.message.fetch().catch(() => null);

  const roleId = roleIdForReaction(reaction);
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  await member?.roles.add(roleId).catch((error) => {
    console.error(`Nie udalo sie nadac roli ${roleId} za reakcje:`, error);
  });
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  if (reaction.message?.partial) await reaction.message.fetch().catch(() => null);

  const roleId = roleIdForReaction(reaction);
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  await member?.roles.remove(roleId).catch((error) => {
    console.error(`Nie udalo sie zabrac roli ${roleId} za reakcje:`, error);
  });
});

client.on("interactionCreate", async (interaction) => {
  try {
  if (interaction.isChatInputCommand()) {
   if (interaction.commandName === "legit") {
  const embed = new EmbedBuilder()
    .setColor("#2B2D31")
    .setAuthor({
      name: "🤔 Mnichu Shop × CZY LEGIT?"
    })
    .setTitle("❓ Czy nasz serwer Mnichu Shop jest LEGIT?")
    .setDescription(
`• <a:tak:1517757067568615535> Jeżeli uważasz, że **TAK** zaznacz reakcję <a:tak:1517757067568615535> poniżej!

• <a:nie:1517757366521565214> Jeżeli uważasz, że **NIE** zaznacz reakcję <a:nie:1517757366521565214> poniżej!

> ⚠️ Zaznaczenie reakcji ❌ bez dowodu skutkuje
> **automatycznym tymczasowym wyciszeniem!**`
    )
    .setThumbnail("https://www.image2url.com/r2/default/images/1780937702836-13645545-4aa2-45f4-ac5d-cfc9896b97d3.png")
    

  const msg = await interaction.channel.send({
    embeds: [embed]
  });

  await msg.react("<a:tak:1517757067568615535>");
  await msg.react("<a:nie:1517757366521565214>");

  return interaction.reply({
    content: "Ankieta została wysłana.",
    ephemeral: true
  });
}
    if (interaction.commandName === "wiadomosc") {
  const wiadomosc = interaction.options.getString("co");

  const embed = new EmbedBuilder()
  .setColor("#00FFFF")
  .setTitle("``Mnichu Shop | 7 zapro = garama × Index``")
  .setDescription(wiadomosc)
  .setTimestamp();

await interaction.channel.send({
  embeds: [embed]
});

  return interaction.reply({
    content: "Wiadomość została wysłana!",
    ephemeral: true,
  });
}
    if (interaction.commandName === "lc") {
      const item = interaction.options.getString("co");
      const price = interaction.options.getString("cena");
      const paymentMethod = interaction.options.getString("metoda");

      return interaction.reply({
        content: `+rep ${interaction.user} ${item} ${price} [${paymentMethod}]`,
        allowedMentions: { users: [interaction.user.id] },
      });
    }

    if (interaction.commandName === "claim") {
      if (!isTicketChannel(interaction.channel)) {
        return interaction.reply({
          content: "Tej komendy mozna uzyc tylko na tickecie.",
          ephemeral: true,
        });
      }

      const ticketType = ticketTypeFromChannel(interaction.channel);

      if (!canUseTicketCommand(interaction.member, ticketType)) {
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

    if (interaction.commandName === "close") {
      if (!isTicketChannel(interaction.channel)) {
        return interaction.reply({
          content: "Tej komendy mozna uzyc tylko na tickecie.",
          ephemeral: true,
        });
      }

      const ticketType = ticketTypeFromChannel(interaction.channel);

      if (!canUseTicketCommand(interaction.member, ticketType)) {
        return interaction.reply({
          content: "Nie masz uprawnien do zamkniecia tego ticketa.",
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: "Zapisuje historie ticketa i zamykam kanal...",
        ephemeral: true,
      });

      await closeTicketWithTranscript(interaction);
      setTimeout(() => interaction.channel.delete().catch(() => null), 3000);
      return;
    }

    const canUseCommand =
      interaction.commandName === "giveaway"
        ? canUseGiveawayCommand(interaction.member)
        : isAdmin(interaction.member);

    if (!canUseCommand) {
      return interaction.reply({
        content: "Tylko administrator moze uzyc tej komendy.",
        ephemeral: true,
      });
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
        AttachFiles: true,
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

    if (type === "partnerstwa") {
  return createTicket(interaction, type, {
    members: interaction.fields.getTextInputValue("ticket_members"),
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

    const ticketType = ticketTypeFromChannel(interaction.channel);

if (!canUseTicketCommand(interaction.member, ticketType)) {
      return interaction.reply({
        content: "Tylko administrator moze zamknac ticketa.",
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: "Zapisuje historie ticketa i zamykam kanal...",
      ephemeral: true,
    });

    await closeTicketWithTranscript(interaction);
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
    console.error("tokenu nje ma w .env.");
    process.exit(1);
  }

  await client.login(process.env.TOKEN);
}

if (require.main === module) {
  startBot().catch((error) => {
    console.error("zjebalo sie.");
    console.error(error);
    process.exit(1);
  });
}

module.exports = { commands };
