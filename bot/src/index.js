import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
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

// Commands
const commands = [
  new SlashCommandBuilder().setName('skin').setDescription('Search for a skin').addStringOption(opt => opt.setName('query').setDescription('Skin name').setRequired(true)),
  new SlashCommandBuilder().setName('skinid').setDescription('Lookup skin by id').addStringOption(opt => opt.setName('id').setDescription('Skin ID').setRequired(true)),
  new SlashCommandBuilder().setName('randomskin').setDescription('Get a random skin'),
  new SlashCommandBuilder().setName('report').setDescription('Report a problem').addStringOption(opt => opt.setName('skin_id').setDescription('Skin ID').setRequired(false)).addStringOption(opt => opt.setName('message').setDescription('Report text').setRequired(true)),
  new SlashCommandBuilder().setName('suggest').setDescription('Suggest a feature').addStringOption(opt => opt.setName('message').setDescription('Suggestion text').setRequired(true)),
  new SlashCommandBuilder().setName('help').setDescription('Show bot help')
].map(c => c.toJSON());

async function registerCommands() {
  try {
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

client.once('ready', async () => {
  console.log('Bot ready:', client.user.tag);
  await ensureSkinsLoaded();
  await registerCommands();
});

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
    } else if (interaction.commandName === 'randomskin') {
      if (!skins.length) await ensureSkinsLoaded();
      const skin = skins[Math.floor(Math.random() * skins.length)];
      const embed = buildSkinEmbed(skin, locale);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel(locale.startsWith('tr') ? "Sitede Görüntüle" : 'View on site').setStyle(ButtonStyle.Link).setURL(websiteSkinUrl(skin.id)),
        new ButtonBuilder().setLabel(locale.startsWith('tr') ? "İndir" : 'Download').setStyle(ButtonStyle.Link).setURL(githubRawFantomeUrl(skin.id))
      );
      await interaction.reply({ embeds: [embed], components: [row] });
    } else if (interaction.commandName === 'report') {
      const skinId = interaction.options.getString('skin_id');
      const message = interaction.options.getString('message');
      // send to report channel
      if (!REPORT_CHANNEL_ID) {
        await interaction.reply({ content: locale.startsWith('tr') ? 'Rapor kanalı yapılandırılmamış.' : 'Report channel not configured.', ephemeral: true });
        return;
      }
      const reportChannel = await client.channels.fetch(REPORT_CHANNEL_ID).catch(()=>null);
      if (!reportChannel) {
        await interaction.reply({ content: locale.startsWith('tr') ? 'Rapor kanalı bulunamadı veya erişim izni yok.' : 'Report channel not found or missing permission.', ephemeral: true });
        return;
      }
      const userTag = `${interaction.user.username}#${interaction.user.discriminator}`;
      const embed = new EmbedBuilder().setTitle(locale.startsWith('tr') ? 'Yeni rapor' : 'New report').addFields(
        { name: 'User', value: userTag, inline: true },
        { name: 'Skin ID', value: skinId || 'N/A', inline: true },
        { name: 'Message', value: message }
      ).setTimestamp();
      await reportChannel.send({ embeds: [embed] });
      await interaction.reply({ content: locale.startsWith('tr') ? 'Rapor gönderildi, teşekkürler.' : 'Report submitted, thank you.', ephemeral: true });
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
