const fs = require('fs');
const content = fs.readFileSync('dist/index.html', 'utf8');
const checks = [
  ['updates button', 'lang-switch-text" data-i18n="updates"'],
  ['bugReport button', 'lang-switch-text" data-i18n="bugReport"'],
  ['filter-summary', 'filter-summary lang-switch-text'],
  ['discord-contact-status-text', 'discord-contact-status-text lang-switch-text'],
  ['discord-profile-label', 'discord-profile-label lang-switch-text'],
  ['discord-profile strong', 'strong class="lang-switch-text"'],
  ['how-to-use kicker', 'howToUseKicker'],
  ['how-to-use title', 'howToUseModalTitle'],
];
checks.forEach(([name, str]) => {
  console.log(name + ':', content.includes(str));
});