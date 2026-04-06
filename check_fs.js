
const FS = require('expo-file-system');
console.log('Keys:', Object.keys(FS));
console.log('cacheDirectory:', FS.cacheDirectory);
console.log('copyAsync:', typeof FS.copyAsync);
