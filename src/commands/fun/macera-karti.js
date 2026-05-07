import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { randomInt } from '../../utils/random.js';

const locations = [
  'Sisli Zirve Dağları',
  'Unutulmuş Arşiv Tünelleri',
  'Luminova Ormanı',
  'Galaksi Pazarı',
  'Derin Deniz Laboratuvarı',
  'Sonsuz Kütüphane',
  'Neon Şehir Meydanı',
  'Kristal Mağaralar',
  'Kayıp Zaman Tapınağı',
  'Fırtına İstasyonu'
];

const objectives = [
  'efsanevi bir artefaktı korumak',
  'zamana meydan okuyan bir bilmeceyi çözmek',
  'topluluğu motive edecek yeni bir etkinlik fikri toplamak',
  'kaçak robotları sakinleştirmek',
  'gizemli veri paketini teslim etmek',
  'yeni katılan üyelere rehber hazırlamak',
  'Sunucu Koruma Protokolünü yeniden başlatmak',
  'kaybolan dostu bulup ekibe geri getirmek',
  'gizli ekonomistlerin planını bozmak',
  'kayıt sistemini tehdit eden hatayı gidermek'
];

const companions = [
  'bilge kedi Misket',
  'gizli ajanın hologramı',
  'neşeli müzisyen Ajda',
  'Furmin veri analisti Nova',
  'pro üyelerden oluşan mini takım',
  'guard sistemine hakim uzman Lyra',
  'ticket ekibinin kahramanı Vega',
  'mod-log arşivcisi Orion',
  'ekonomi denetçisi Zeta',
  'maceracı bir yapay zekâ dronu'
];

const rewards = [
  'sunucuda efsanevi bir rozet',
  'extra FurCoin bonusu',
  'özel moderasyon rehberi',
  'kayıt sistemine hızlandırıcı buff',
  'guard loglarında kahramanlık notu',
  'ticket panosunda teşekkür mesajı',
  'günlük motivasyon kupası',
  'özel ses odasında bir kutlama',
  'sunucu duyurusunda onur köşesi',
  'Furmin Merkez’de yıldızlı kart'
];

function pickRandom(list) {
  if (!Array.isArray(list) || !list.length) {
    return 'bilinmeyen bir sürpriz';
  }
  const index = randomInt(0, list.length - 1);
  return list[index];
}

export default {
  category: 'Eğlence',
  menuGroup: 'Mini Oyunlar',
  data: new SlashCommandBuilder()
    .setName('macera-karti')
    .setDescription('Rastgele bir Furmin macera kartı oluşturur.'),
  async execute(interaction) {
    const location = pickRandom(locations);
    const objective = pickRandom(objectives);
    const companion = pickRandom(companions);
    const reward = pickRandom(rewards);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🗺️ Bugünün Macera Kartı')
      .setDescription('Şansını dene ve Furmin evreninde yeni bir göreve atıl!')
      .addFields(
        { name: 'Bölge', value: location, inline: true },
        { name: 'Görev', value: objective, inline: true },
        { name: 'Ekip Arkadaşı', value: companion, inline: false },
        { name: 'Beklenen Ödül', value: reward, inline: false }
      )
      .setFooter({ text: 'Furmin Eğlence Salonu • Kartı arkadaşlarınla paylaşmayı unutma!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
