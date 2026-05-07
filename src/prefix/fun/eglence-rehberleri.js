import { funPlayground } from '../../data/additionalPrefixContent.js';
import { createSimplePrefixCommands } from '../../utils/prefixCommandFactory.js';

export default createSimplePrefixCommands(funPlayground, {
  category: 'Eğlence',
  menuGroup: 'Eğlence Paketleri',
  color: 0xf1c40f,
  fieldName: 'Görev Kartı'
});
