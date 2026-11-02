import type { StudioGoal } from './studio';

export const storyActs = [
  { id: 'studio', title: 'A place to begin', place: 'Island studio', ending: 'The studio is home again.', text: 'You repaired the workshop, filled the library, opened the art room, and gave the creatures a home.', invitation: 'A letter from Mara has arrived. The harbour needs a helping hand.', action: 'Read Mara’s letter →' },
  { id: 'harbour', title: 'Letters from the harbour', place: 'Lantern harbour', ending: 'The harbour lights are back.', text: 'Boats can find their way home, the charts are ready, and the rescued creatures have a safe shelter.', invitation: 'Your neighbours have an idea: a festival to celebrate everything you have made together.', action: 'Plan the island festival →' },
  { id: 'festival', title: 'A festival of little wonders', place: 'Festival meadow', ending: 'A whole island, brought together.', text: 'The market is open, the stories are being told, and the gallery glows beneath a sky full of stars. Every little thing you made helped bring this island together.', invitation: 'The three stories are complete. Your island, collection and tools stay yours.', action: '' },
];

export const firstLetters = [
  { speaker: 'Mara · boatkeeper', letter: 'I found a spare key to the old studio. If we mend that workbench, perhaps it could be a place for all of us again.' },
  { speaker: 'Finn · mapmaker', letter: 'I used to draw maps in this reading corner. May I leave a notebook here for the next person who gets a little lost?' },
  { speaker: 'Ada · lighthouse keeper', letter: 'A light is more than a lamp. Sometimes it is a blank page and a brush, waiting for someone to begin.' },
  { speaker: 'Jun · creature carer', letter: 'A small cat has been watching the door. I think it knows this is going to be a home. Let’s make room for its friends.' },
];

export const islandChapters = [
  {
    id: 'harbour-gate', title: 'Welcome the returning boats', room: 'Landing',
    speaker: 'Mara · boatkeeper', letter: 'The studio window is glowing again! Could you help me open the harbour gate? I want the next boat to find a welcome, not a locked door.',
    story: 'Repair the landing and make a welcome desk for returning islanders.',
    restored: 'The first boat ties up beside a repaired landing. Mara lends you a sorting tray: you can now choose which item chain to draw.',
    unlock: 'Focused drawing · choose an unlocked item chain',
    reward: { coins: 90, ink: 25, xp: 160 },
    goals: [
      { id: 'landing-knight', kind: 'discover', item: { chain: 'heroes', tier: 5 }, reason: 'Meet the guardian of the landing.' },
      { id: 'landing-host', kind: 'supply', item: { chain: 'heroes', tier: 4 }, reason: 'Welcome the travellers at the gate.' },
      { id: 'landing-books', kind: 'supply', quantity: 2, item: { chain: 'paper', tier: 4 }, reason: 'Two sketchbooks for visitors’ messages.' },
    ],
  },
  {
    id: 'chart-room', title: 'Draw a way home', room: 'Chart room',
    speaker: 'Finn · mapmaker', letter: 'The old charts stop at the reef. I would like to draw a safer route, with little notes about every cove. Can you help stock my chart room?',
    story: 'Turn a weathered harbour hut into a place to plan safe journeys.',
    restored: 'Finn pins the new charts to the wall and gives you a three-pocket satchel for keeping useful items off the board.',
    unlock: 'Satchel · store 3 items and retrieve them later',
    reward: { coins: 110, ink: 25, xp: 180 },
    goals: [
      { id: 'charts-stack', kind: 'discover', item: { chain: 'paper', tier: 6 }, reason: 'Collect the island’s old journals.' },
      { id: 'charts-story', kind: 'supply', item: { chain: 'paper', tier: 5 }, reason: 'A book of remembered routes.' },
      { id: 'charts-pens', kind: 'supply', quantity: 2, item: { chain: 'tools', tier: 3 }, reason: 'A pen for Finn and one for his apprentice.' },
    ],
  },
  {
    id: 'signal-loft', title: 'Send a light across the water', room: 'Signal loft',
    speaker: 'Ada · lighthouse keeper', letter: 'Mara can hear boats in the mist, but they cannot see the landing. I have a plan for a signal loft. We only need a little color and a steady hand.',
    story: 'Paint the signal panels and relight the loft above the harbour.',
    restored: 'A warm signal sweeps across the water. Ada repairs your ink well: a drop now returns every 25 seconds.',
    unlock: 'Better ink well · refills every 25 seconds',
    reward: { coins: 130, ink: 30, xp: 200 },
    goals: [
      { id: 'signal-picture', kind: 'discover', item: { chain: 'tools', tier: 6 }, reason: 'Design a picture that can be seen from sea.' },
      { id: 'signal-brushes', kind: 'supply', quantity: 2, item: { chain: 'tools', tier: 4 }, reason: 'Paint both sides of the signal panels.' },
      { id: 'signal-plans', kind: 'supply', item: { chain: 'paper', tier: 4 }, reason: 'Keep Ada’s plans safe for the next keeper.' },
    ],
  },
  {
    id: 'tidepool-shelter', title: 'Make a safe shore', room: 'Tide pools',
    speaker: 'Jun · creature carer', letter: 'The tide brought us a tired fox and a very unusual visitor. Let’s make somewhere quiet beside the pools, away from the busy boats.',
    story: 'Build a sheltered corner where rescued creatures can rest before returning to the island.',
    restored: 'The creatures settle beside the tide pools. Jun adds three more pockets to your satchel. The harbour is alive again.',
    unlock: 'Larger satchel · store 6 items',
    reward: { coins: 160, ink: 35, xp: 240 },
    goals: [
      { id: 'pools-unicorn', kind: 'discover', item: { chain: 'creatures', tier: 7 }, reason: 'Welcome an unexpected guest to the shore.' },
      { id: 'pools-fox', kind: 'supply', item: { chain: 'creatures', tier: 5 }, reason: 'Help the fox find its new resting place.' },
      { id: 'pools-stories', kind: 'supply', quantity: 2, item: { chain: 'paper', tier: 5 }, reason: 'Stories for the shelter’s quiet afternoons.' },
    ],
  },
  {
    id: 'market-square', title: 'Bring the neighbours together', room: 'Market',
    speaker: 'Mara · boatkeeper', letter: 'Everyone keeps asking when they can see the studio. What if we had a festival? I can bring the stalls if you can help with the welcome.',
    story: 'Open a little market where the islanders can share what they make.',
    restored: 'The market opens to the smell of fresh bread and the sound of neighbours meeting. Mara’s new ink pump refills a drop every 20 seconds.',
    unlock: 'Festival ink pump · refills every 20 seconds',
    reward: { coins: 180, ink: 40, xp: 260 },
    goals: [
      { id: 'market-hero', kind: 'discover', item: { chain: 'heroes', tier: 8 }, reason: 'Find the guest of honour.' },
      { id: 'market-wizard', kind: 'supply', item: { chain: 'heroes', tier: 6 }, reason: 'A storyteller to welcome the crowd.' },
      { id: 'market-palettes', kind: 'supply', quantity: 2, item: { chain: 'tools', tier: 5 }, reason: 'Paint signs for both rows of stalls.' },
    ],
  },
  {
    id: 'story-pavilion', title: 'Give every story a home', room: 'Pavilion',
    speaker: 'Finn · mapmaker', letter: 'The children want a map to an imaginary kingdom. Perhaps the festival needs a pavilion where the stories can be bigger than the island.',
    story: 'Build a pavilion for readings, drawings and adventures that begin on a page.',
    restored: 'A paper castle rises above the reading cushions. Finn stitches a final row of pockets into your satchel: nine treasures can now travel with you.',
    unlock: 'Explorer’s satchel · store 9 items',
    reward: { coins: 200, ink: 40, xp: 280 },
    goals: [
      { id: 'pavilion-castle', kind: 'discover', item: { chain: 'paper', tier: 8 }, reason: 'Discover a kingdom made of stories.' },
      { id: 'pavilion-books', kind: 'supply', item: { chain: 'paper', tier: 6 }, reason: 'Fill the pavilion’s reading table.' },
      { id: 'pavilion-knight', kind: 'supply', item: { chain: 'heroes', tier: 5 }, reason: 'A knight for the children’s play.' },
    ],
  },
  {
    id: 'moonlight-gallery', title: 'Let the island shine', room: 'Gallery',
    speaker: 'Ada · lighthouse keeper', letter: 'I have spent years lighting the sea. Tonight I would like to light something people made. Could we hang a gallery beneath the lanterns?',
    story: 'Gather the island’s art for a moonlit exhibition beside the festival meadow.',
    restored: 'Lanterns illuminate every painting. The gallery’s gold frame joins your story journal as a reminder of what small beginnings can become.',
    unlock: 'Moonlight gallery · a permanent place in the story journal',
    reward: { coins: 230, ink: 45, xp: 300 },
    goals: [
      { id: 'gallery-masterpiece', kind: 'discover', item: { chain: 'tools', tier: 8 }, reason: 'Find the picture at the heart of the exhibition.' },
      { id: 'gallery-picture', kind: 'supply', item: { chain: 'tools', tier: 6 }, reason: 'Hang a painting beside the entrance.' },
      { id: 'gallery-catalogue', kind: 'supply', item: { chain: 'paper', tier: 6 }, reason: 'A catalogue for everyone who visits.' },
    ],
  },
  {
    id: 'star-whale-homecoming', title: 'Welcome the star whale', room: 'Homecoming',
    speaker: 'Jun · creature carer', letter: 'There is a shadow moving beyond the reef, with stars on its back. All the little lights we made have shown it the way home. Will you help welcome it?',
    story: 'Bring the last guests together for a homecoming beneath the festival sky.',
    restored: 'The star whale passes the harbour lights as the whole island gathers. Twelve chapters, countless small kindnesses, and one place that feels like home.',
    unlock: 'Island storyteller · all three stories complete',
    reward: { coins: 300, ink: 60, xp: 400 },
    goals: [
      { id: 'homecoming-whale', kind: 'discover', item: { chain: 'creatures', tier: 8 }, reason: 'Guide the star whale home.' },
      { id: 'homecoming-dragon', kind: 'supply', item: { chain: 'creatures', tier: 6 }, reason: 'A guardian to lead the welcome.' },
      { id: 'homecoming-wizard', kind: 'supply', item: { chain: 'heroes', tier: 6 }, reason: 'One last story to share with the island.' },
    ],
  },
] satisfies { id: string; title: string; room: string; speaker: string; letter: string; story: string; restored: string; unlock: string; reward: { coins: number; ink: number; xp: number }; goals: StudioGoal[] }[];
