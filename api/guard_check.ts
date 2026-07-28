import { isEvasiveReply, hasBannedOpener, stripLeadingBannedOpener } from './src/lib/adviceGuard'

const goodEn = `This isn't just a CFO problem, it's a leadership architecture problem.

My preliminary recommendation is: engage the fractional CHRO on a time-limited basis, provided they convince you both professionally and personally.`

const badEn1 = `It sounds like you're dealing with a lot right now. What values matter most to you here?`
const badEn2 = `You're facing a complex leadership challenge. It might be worth having an honest conversation with the CFO.`
const badEn3 = `You are in a complex situation with your CHRO candidate.`

console.log('good (should be false):', isEvasiveReply(goodEn, 'en'))
console.log('bad1 (should be true):', isEvasiveReply(badEn1, 'en'))
console.log('bad2 (should be true):', isEvasiveReply(badEn2, 'en'))
console.log('bad3 banned opener (should be true):', hasBannedOpener(badEn3, 'en'))
console.log('strip bad3:', stripLeadingBannedOpener(badEn3 + ' A clear mandate would help.', 'en'))
