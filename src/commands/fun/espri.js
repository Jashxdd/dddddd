import { SlashCommandBuilder } from 'discord.js';

const jokes = [
  'Bilgisayar neden doktora gitmis? Cunku virüs kapmis!',
  'Programcilar neden karanlik modu sever? Cunku isik bug ceker.',
  '404 hatasi nedir bilir misin? Bulamadim... ama aramaya devam ediyorum!',
  'Teknik destek hattini aradim, acmadilar. Sanirim onlar da destegi supportluyor.',
  'Sunucuya kahve verdim, simdi java calisiyor!'
];

export default {
  category: 'Eglence',
  data: new SlashCommandBuilder().setName('espri').setDescription('Rastgele bir teknoloji espirisi yapar.'),
  async execute(interaction) {
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    await interaction.reply({ content: `😂 ${joke}`, ephemeral: true });
  }
};
