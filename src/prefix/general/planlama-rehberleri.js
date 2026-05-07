import { generalToolkit } from '../../data/additionalPrefixContent.js';
import { createSimplePrefixCommands } from '../../utils/prefixCommandFactory.js';

export default createSimplePrefixCommands(generalToolkit, {
  category: 'Genel',
  menuGroup: 'Planlama Rehberleri',
  color: 0x1abc9c,
  fieldName: 'Önerilen Adımlar'
});
