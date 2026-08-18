import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  DISCORD_TOKEN,
  GITHUB_REPO,
  GITHUB_BRANCH = 'main',
  GITHUB_SKINS_PATH = 'public/data',
  UPDATE_CHANNEL_ID,
  REPORT_CHANNEL_ID,
  SUGGESTION_CHANNEL_ID,
  BOT_OWNER_ID,
  GUILD_ID
} = process.env;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is not set. Set it in your environment.');
  process.exit(1);
}

if (!GITHUB_REPO) {
  console.error('GITHUB_REPO is not set. Set it in your environment (owner/repo).');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Load skins data from repo working copy if available, fallback to GitHub raw
let skins = [];
const localSkinsPath = path.resolve(__dirname, '..', '..', GITHUB_SKINS_PATH, 'skins.json');

function loadLocalSkins() {
  try {
    if (fs.existsSync(localSkinsPath)) {
      const raw = fs.readFileSync(localSkinsPath, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.skins)) {
        skins = data.skins;
        console.log(`Loaded ${skins.length} skins from local skins.json`);
        return true;
      }
    }
  } catch (err) {
    console.warn('Failed to read local skins.json:', err.message);
  }
  return false;
}

async function loadSkinsFromGitHub() {
  try {
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_SKINS_PATH}/skins.json`;
    const res = await fetch(rawUrl);
    if (!res.ok) {
      console.error('Failed to fetch skins.json from GitHub:', res.status, res.statusText);
      return false;
    }
    const data = await res.json();
    if (Array.isArray(data.skins)) {
      skins = data.skins;
      console.log(`Loaded ${skins.length} skins from GitHub`);
      return true;
    }
  } catch (err) {
    console.error('Error loading skins from GitHub:', err.message);
  }
  return false;
}

function normalizeText(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function scoreStringMatch(target, query) {
  // priority: exact > startsWith > whole word > substring > fuzzy
  const t = normalizeText(target);
  const q = normalizeText(query);
  if (!q) return 0;
  if (t === q) return 10000;
  if (t.startsWith(q)) return 8000;
  // whole word
  if (t.split(/\s+/).some(w => w === q)) return 6000;
  if (t.includes(q)) return 4000;
  // fuzzy: characters in order
  let i = 0;
  for (const ch of q) {
    i = t.indexOf(ch, i);
    if (i === -1) return 0;
    i++;
  }
  // penalize distance
  const idx = normalizeText(target).indexOf(q[0]);
  return 100 + Math.max(0, 1000 - (idx || 0));
}

function searchSkins(query, limit = 10) {
  const q = String(query || '').trim();
  if (!q) return [];
  const results = skins.map(skin => {
    const name = `${skin.name || ''} ${skin.champion || ''} ${skin.nameEn || ''} ${skin.championEn || ''}`;
    const score = scoreStringMatch(name, q) + scoreStringMatch(skin.id || '', q) * 2;
    return { skin, score };
  }).filter(r => r.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.skin);
  return results;
}

function findSkinById(id) {
  return skins.find(s => String(s.id) === String(id));
}

function githubRawFantomeUrl(id) {
  // uses GITHUB_REPO, GITHUB_BRANCH, GITHUB_SKINS_PATH
  return `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_SKINS_PATH}/fantome/${id}.fantome`;
}

function websiteSkinUrl(id) {
  // best-effort: link to homepage with query param; site doesn't expose per-skin pages
  return `${clientSiteBase()}/?q=${encodeURIComponent(id)}`;
}

function clientSiteBase() {
  // attempt to read homepage URL from index.html meta og:url
  try {
    const indexPath = path.resolve(__dirname, '..', '..', 'index.html');
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf8');
      const m = content.match(/<meta\s+property="og:url"\s+content="([^"]+)"/i);
      if (m) return m[1].replace(/\/$/, '');
    }
  } catch (err) {
    // ignore
  }
  return 'https://existye4t.github.io/lol-skin-finder';
}

// Build embed for a skin
function buildSkinEmbed(skin, locale='en') {
  const title = (locale.startsWith('tr') ? (skin.name || skin.name) : (skin.nameEn || skin.name || ''));
  const champ = (locale.startsWith('tr') ? (skin.champion || skin.champion) : (skin.championEn || skin.champion || ''));
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(`${champ} • ID ${skin.id}`)
    .setColor(0x586cf0)
    .setTimestamp();
  if (skin.image) embed.setImage(skin.image);
  return embed;
}

async function ensureSkinsLoaded() {
  if (loadLocalSkins()) return;
  await loadSkinsFromGitHub();
}

// Localization strings
const TRANSLATIONS = {
  en: {
    no_match: 'No matching skin found.',
    no_id: 'No skin found for that ID.',
    report_channel_not_config: 'Report channel not configured.',
    report_channel_not_found: 'Report channel not found or missing permission.',
    report_submitted: 'Report submitted, thank you.',
    suggestion_channel_not_config: 'Suggestion channel not configured.',
    suggestion_channel_not_found: 'Suggestion channel not found or missing permission.',
    suggestion_submitted: 'Suggestion submitted, thank you.',
    command_error: 'An error occurred while processing the command.',
    processing: 'Processing...',
    file_too_large: 'File is too large to upload; here is a download link:',
    report_rate_limited: 'You are sending reports too quickly. Please wait and try again later.'
  },
  tr: {
    no_match: 'Eşleşen skin bulunamadı.',
    no_id: 'ID ile eşleşen skin bulunamadı.',
    report_channel_not_config: 'Rapor kanalı yapılandırılmamış.',
    report_channel_not_found: 'Rapor kanalı bulunamadı veya erişim izni yok.',
    report_submitted: 'Rapor gönderildi, teşekkürler.',
    suggestion_channel_not_config: 'Öneri kanalı yapılandırılmamış.',
    suggestion_channel_not_found: 'Öneri kanalı bulunamadı veya erişim izni yok.',
    suggestion_submitted: 'Öneriniz gönderildi, teşekkürler.',
    command_error: 'Komut işlenirken hata oluştu.',
    processing: 'İşleniyor...',
    file_too_large: 'Dosya yüklenemeyecek kadar büyük; indirme bağlantısı:',
    report_rate_limited: 'Çok hızlı rapor gönderiyorsunuz. Lütfen biraz bekleyip tekrar deneyin.'
  }
};

function t(key, locale) {
  const lang = (locale || 'en').startsWith('tr') ? 'tr' : 'en';
  return TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key] || key;
}

// Rate limiting for reports to prevent spam
const reportCooldownMs = 30 * 1000; // 30s
const lastReport = new Map();

// File upload limits
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB conservative

async function headContentLength(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return null;
    const len = res.headers.get('content-length');
    return len ? parseInt(len, 10) : null;
  } catch (err) {
    return null;
  }
}

async function fetchBufferWithLimit(url, limit) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // try content-length first
  const len = res.headers.get('content-length');
  if (len && parseInt(len, 10) > limit) {
    const err = new Error('Too large');
    err.code = 'TOO_LARGE';
    throw err;
  }
  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  if (buf.length > limit) {
    const err = new Error('Too large');
    err.code = 'TOO_LARGE';
    throw err;
  }
  return buf;
}

async function tryAttachFantome(interaction, id, locale) {
  const url = githubRawFantomeUrl(id);
  // check content-length
  const cl = await headContentLength(url);
  if (cl && cl > MAX_UPLOAD_BYTES) {
    await interaction.followUp({ content: `${t('file_too_large', locale)} ${url}`, ephemeral: true });
    return;
  }
  try {
    const buf = await fetchBufferWithLimit(url, MAX_UPLOAD_BYTES);
    // send as follow-up as a file
    await interaction.followUp({ files: [{ attachment: buf, name: `${id}.fantome` }] });
  } catch (err) {
    if (err.code === 'TOO_LARGE') {
      await interaction.followUp({ content: `${t('file_too_large', locale)} ${url}`, ephemeral: true });
      return;
    }
    console.warn('Failed to fetch fantome:', err.message);
    await interaction.followUp({ content: `${t('command_error', locale)} (${err.message})`, ephemeral: true });
  }
}

// Commands
// Ensure required options are defined before optional ones to satisfy Discord API validation.
const commands = [
  new SlashCommandBuilder()
    .setName('skin')
    .setDescription('Search for a skin')
    .addStringOption(opt => opt.setName('query').setDescription('Skin name').setRequired(true)),

  new SlashCommandBuilder()
    .setName('skinid')
    .setDescription('Lookup skin by id')
    .addStringOption(opt => opt.setName('id').setDescription('Skin ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('randomskin')
    .setDescription('Get a random skin'),

  // For report: required 'message' must come before optional 'skin_id'
  new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report a problem')
    .addStringOption(opt => opt.setName('message').setDescription('Report text').setRequired(true))
    .addStringOption(opt => opt.setName('skin_id').setDescription('Skin ID').setRequired(false)),

  new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Suggest a feature')
    .addStringOption(opt => opt.setName('message').setDescription('Suggestion text').setRequired(true)),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show bot help')
].map(c => c.toJSON());

function validateCommandOptions(cmdJson) {
  if (!cmdJson.options || !Array.isArray(cmdJson.options)) return true;
  let seenOptional = false;
  for (const opt of cmdJson.options) {
    const req = !!opt.required;
    if (!req) seenOptional = true;
    if (seenOptional && req) return false;
  }
  return true;
}

async function registerCommands() {
  try {
    // validate commands before sending to Discord
    for (const c of commands) {
      if (!validateCommandOptions(c)) {
        throw new Error(Command '' has required options after optional ones. Reorder required options before optional ones.);
      }
    }

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(client.application.id, GUILD_ID), { body: commands });
      console.log('Registered guild commands');
    } else {
      await rest.put(Routes.applicationCommands(client.application.id), { body: commands });
      console.log('Registered global commands');
    }
  } catch (err) {
    console.error('Error registering commands:', err.message);
  }
}

// Use a resilient ready handler: prefer 'clientReady' when available but fall back to 'ready'.
let _readyHandled = false;
async function onClientReady() {
  if (_readyHandled) return;
  _readyHandled = true;
  console.log('Bot ready:', client.user.tag);
  await ensureSkinsLoaded();
  await registerCommands();
}

// Register both events so the bot works with discord.js versions that emit either.
client.once('clientReady', onClientReady);
client.once('ready', onClientReady);

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const locale = interaction.locale || 'en';
  try {
    if (interaction.commandName === 'skin') {
      const q = interaction.options.getString('query');
      const results = searchSkins(q, 6);
      if (!results.length) {
        await interaction.reply({ content: locale.startsWith('tr') ? 'Eşleşen skin bulunamadı.' : 'No matching skin found.', ephemeral: true });
        return;
      }
      const first = results[0];
      const embed = buildSkinEmbed(first, locale);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel(locale.startsWith('tr') ? "Sitede Görüntüle" : 'View on site').setStyle(ButtonStyle.Link).setURL(websiteSkinUrl(first.id)),
        new ButtonBuilder().setLabel(locale.startsWith('tr') ? "İndir" : 'Download').setStyle(ButtonStyle.Link).setURL(githubRawFantomeUrl(first.id))
      );
      await interaction.reply({ embeds: [embed], components: [row] });
      // Attempt to attach the fantome file if it is small enough; otherwise provide the raw link
      tryAttachFantome(interaction, first.id, locale).catch(err => console.warn('attach error', err));
    } else if (interaction.commandName === 'skinid') {
      const id = interaction.options.getString('id');
      const found = findSkinById(id);
      if (!found) {
        await interaction.reply({ content: locale.startsWith('tr') ? 'ID ile eşleşen skin bulunamadı.' : 'No skin found for that ID.', ephemeral: true });
        return;
      }
      const embed = buildSkinEmbed(found, locale);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel(locale.startsWith('tr') ? "Sitede Görüntüle" : 'View on site').setStyle(ButtonStyle.Link).setURL(websiteSkinUrl(found.id)),
        new ButtonBuilder().setLabel(locale.startsWith('tr') ? "İndir" : 'Download').setStyle(ButtonStyle.Link).setURL(githubRawFantomeUrl(found.id))
      );
      await interaction.reply({ embeds: [embed], components: [row] });
      tryAttachFantome(interaction, found.id, locale).catch(err => console.warn('attach error', err));
    } else if (interaction.commandName === 'randomskin') {
      if (!skins.length) await ensureSkinsLoaded();
      const skin = skins[Math.floor(Math.random() * skins.length)];
      const embed = buildSkinEmbed(skin, locale);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel(locale.startsWith('tr') ? "Sitede Görüntüle" : 'View on site').setStyle(ButtonStyle.Link).setURL(websiteSkinUrl(skin.id)),
        new ButtonBuilder().setLabel(locale.startsWith('tr') ? "İndir" : 'Download').setStyle(ButtonStyle.Link).setURL(githubRawFantomeUrl(skin.id))
      );
      await interaction.reply({ embeds: [embed], components: [row] });
      tryAttachFantome(interaction, skin.id, locale).catch(err => console.warn('attach error', err));
    } else if (interaction.commandName === 'report') {
      const skinId = interaction.options.getString('skin_id');
      const message = interaction.options.getString('message');
      // rate limit per user
      const last = lastReport.get(interaction.user.id) || 0;
      const now = Date.now();
      if (now - last < reportCooldownMs) {
        await interaction.reply({ content: t('report_rate_limited', locale), ephemeral: true });
        return;
      }
      lastReport.set(interaction.user.id, now);
      // send to report channel
      if (!REPORT_CHANNEL_ID) {
        await interaction.reply({ content: t('report_channel_not_config', locale), ephemeral: true });
        return;
      }
      const reportChannel = await client.channels.fetch(REPORT_CHANNEL_ID).catch(()=>null);
      if (!reportChannel) {
        await interaction.reply({ content: t('report_channel_not_found', locale), ephemeral: true });
        return;
      }
      const userTag = `${interaction.user.username}#${interaction.user.discriminator}`;
      const embed = new EmbedBuilder().setTitle(locale.startsWith('tr') ? 'Yeni rapor' : 'New report').addFields(
        { name: 'User', value: userTag, inline: true },
        { name: 'Skin ID', value: skinId || 'N/A', inline: true },
        { name: 'Message', value: message }
      ).setTimestamp();
      await reportChannel.send({ embeds: [embed] });
      await interaction.reply({ content: t('report_submitted', locale), ephemeral: true });
    } else if (interaction.commandName === 'suggest') {
      const message = interaction.options.getString('message');
      if (!SUGGESTION_CHANNEL_ID) {
        await interaction.reply({ content: locale.startsWith('tr') ? 'Öneri kanalı yapılandırılmamış.' : 'Suggestion channel not configured.', ephemeral: true });
        return;
      }
      const suggestionChannel = await client.channels.fetch(SUGGESTION_CHANNEL_ID).catch(()=>null);
      if (!suggestionChannel) {
        await interaction.reply({ content: locale.startsWith('tr') ? 'Öneri kanalı bulunamadı veya erişim izni yok.' : 'Suggestion channel not found or missing permission.', ephemeral: true });
        return;
      }
      const userTag = `${interaction.user.username}#${interaction.user.discriminator}`;
      const embed = new EmbedBuilder().setTitle(locale.startsWith('tr') ? 'Yeni öneri' : 'New suggestion').addFields(
        { name: 'User', value: userTag },
        { name: 'Suggestion', value: message }
      ).setTimestamp();
      await suggestionChannel.send({ embeds: [embed] });
      await interaction.reply({ content: locale.startsWith('tr') ? 'Öneriniz gönderildi, teşekkürler.' : 'Suggestion submitted, thank you.', ephemeral: true });
    } else if (interaction.commandName === 'help') {
      const embed = new EmbedBuilder().setTitle(locale.startsWith('tr') ? 'Bot Komutları' : 'Bot Commands').setColor(0x586cf0).setDescription(
        locale.startsWith('tr') ? '/skin <isim> — Skin ara\n/skinid <id> — ID ile ara\n/randomskin — Rastgele skin\n/report — Sorun bildir\n/suggest — Öneri gönder' : '/skin <name> — Search\n/skinid <id> — Lookup by ID\n/randomskin — Random skin\n/report — Report a problem\n/suggest — Send suggestion'
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (err) {
    console.error('Command error:', err);
    await interaction.reply({ content: locale.startsWith('tr') ? 'Komut işlenirken hata oluştu.' : 'An error occurred while processing the command.', ephemeral: true });
  }
});

client.login(DISCORD_TOKEN).catch(err => {
  console.error('Failed to login:', err.message);
  process.exit(1);
});

