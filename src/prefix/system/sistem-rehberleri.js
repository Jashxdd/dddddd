import { systemToolkit } from '../../data/additionalPrefixContent.js';
import { createSimplePrefixCommands } from '../../utils/prefixCommandFactory.js';

export default createSimplePrefixCommands(systemToolkit, {
  category: 'Sistem',
  menuGroup: 'Sistem Panelleri',
  color: 0x95a5a6,
  fieldName: 'Yapılacaklar'
});
