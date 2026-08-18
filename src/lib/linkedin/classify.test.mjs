import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyLinkedInMail as c } from './classify.mjs'

// Subjects seen in the real mailbox on 2026-08-18 + the shapes LinkedIn documents.
test('reaction', () => assert.deepEqual(c({ subject: 'Ana Pop reacted to your post' }), { kind: 'reaction', authorName: 'Ana Pop', content: null }))
test('aggregated reaction keeps the phrasing', () => assert.equal(c({ subject: 'Ana Pop and 3 others liked your post' }).authorName, 'Ana Pop and 3 others'))
test('comment beats reaction ordering', () => assert.equal(c({ subject: 'Ion Ionescu commented on your post' }).kind, 'comment'))
test('accepted invitation', () => assert.deepEqual(c({ subject: 'Alexandra accepted your invitation, explore their network' }), { kind: 'invitation_accepted', authorName: 'Alexandra', content: null }))
test('profile view', () => assert.equal(c({ subject: 'Mihai Georgescu viewed your profile' }).kind, 'profile_view'))
test('invitation count', () => assert.deepEqual(c({ subject: 'You have 2 new invitations' }), { kind: 'invitation', authorName: '2 new invitations', content: null }))
test('single invitation singular', () => assert.equal(c({ subject: 'You have 1 new invitation' }).authorName, '1 new invitation'))
test('message', () => assert.equal(c({ subject: 'Dana Marin sent you a message' }).kind, 'message'))
test('snippet becomes content, capped', () => assert.equal(c({ subject: 'X commented on your post', snippet: 'a'.repeat(900) }).content.length, 500))
test('noise: device verification', () => assert.equal(c({ subject: 'Alex, please verify your new device' }), null))
test('noise: popular in network', () => assert.equal(c({ subject: 'Jared Spataro, Chief Marketing Officer, is popular in your network' }), null))
test('noise: meet suggestion', () => assert.equal(c({ subject: 'Alex, meet Catalina Nicolescu 🤛' }), null))
test('noise: opportunities', () => assert.equal(c({ subject: 'Custom Software Development opportunities may be available' }), null))
test('unknown subject is skipped, not guessed', () => assert.equal(c({ subject: 'Something LinkedIn invents next quarter' }), null))
test('empty subject', () => assert.equal(c({ subject: '' }), null))
