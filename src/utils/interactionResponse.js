export async function replyWithMessage(interaction, options = {}) {
  const { withResponse: requestWithResponse = true, ...replyOptions } = options;
  let response;
  let replied = interaction.replied || interaction.deferred;

  if (requestWithResponse) {
    try {
      response = await interaction.reply({ ...replyOptions, withResponse: true });
      replied = true;
    } catch (error) {
      if (!replied) {
        await interaction.reply(replyOptions);
        replied = true;
      } else {
        throw error;
      }
    }
  } else if (!replied) {
    await interaction.reply(replyOptions);
    replied = true;
  }

  if (response && typeof response.fetch === 'function') {
    try {
      return await response.fetch();
    } catch (error) {
      console.warn('⚠️ Interaction yanıtı fetch edilirken hata oluştu.', error);
    }
  }

  if (typeof interaction.fetchReply === 'function') {
    try {
      return await interaction.fetchReply();
    } catch (error) {
      console.warn('⚠️ Interaction.fetchReply çağrısı başarısız oldu.', error);
    }
  }

  return null;
}
