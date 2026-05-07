import { moderationToolkit } from '../../data/additionalPrefixContent.js';
import { createSimplePrefixCommands } from '../../utils/prefixCommandFactory.js';

export default createSimplePrefixCommands(moderationToolkit, {
  category: 'Moderasyon',
  menuGroup: 'Rehberler',
  color: 0xe74c3c,
  fieldName: 'Kontrol Listesi'
});
