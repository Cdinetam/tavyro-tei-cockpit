import { hasListFormatting, stripListMarkers } from './src/lib/adviceGuard'

const en1 = `My preliminary recommendation is to first articulate a clear and expanded role profile for the CFO, aligned with your strategic goals.

Sequence of action:
1. Within the next two weeks, draft a detailed CFO role profile reflecting the company's scaling needs.
2. Hold a direct conversation with the CFO, presenting the expectations and assessing their readiness to adapt.
3. Set a clear timeline for performance review or transition, ensuring minimal disruption to operations.

If the CFO is unwilling or unable to meet the new expectations, a replacement becomes necessary.`

const goodProse = `My preliminary recommendation is to proceed cautiously. First, have a direct discussion with the candidate. Second, involve the board in defining the reporting structure. Finally, consider engaging an external advisor.`

console.log('en1 has list (should be true):', hasListFormatting(en1))
console.log('goodProse has list (should be false):', hasListFormatting(goodProse))
console.log('--- stripped en1 ---')
console.log(stripListMarkers(en1))
