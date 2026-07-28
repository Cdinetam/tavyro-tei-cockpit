import { hasBannedOpener } from './src/lib/adviceGuard'
const de1 = "Sie stehen vor einer kritischen Situation, da der Abgang eines COOs ohne geregelte Nachfolge nicht nur operative Lücken hinterlässt."
console.log('kritische Situation (should be true):', hasBannedOpener(de1, 'de'))
