import { economyToolkit } from '../../data/additionalPrefixContent.js';
import { createSimplePrefixCommands } from '../../utils/prefixCommandFactory.js';

export default createSimplePrefixCommands(economyToolkit, {
  category: 'Ekonomi',
  menuGroup: 'FurCoin Stratejileri',
  color: 0xf39c12,
  fieldName: 'İpuçları'
});
