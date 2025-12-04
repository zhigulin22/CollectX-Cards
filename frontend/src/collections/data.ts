import type { Card, Collection } from './types';

export const collections: Collection[] = [
  { id: 'piska', name: 'Piska', icon: '🟥', owned: 0, total: 6 },
  { id: 'gleb', name: 'Глеб', icon: '🟥', owned: 1, total: 1 },
  { id: 'bored', name: 'Bored Ape Yacht Club', icon: '🦍', owned: 6, total: 6 },
  { id: 'azuki', name: 'Azuki', icon: '😈', owned: 6, total: 6 },
  { id: 'pudgy', name: 'Pudgy Penguins', icon: '🐧', owned: 4, total: 6 },
  { id: 'doodles', name: 'Doodles', icon: '🎨', owned: 6, total: 6 },
  { id: 'punks', name: 'CryptoPunks', icon: '👾', owned: 6, total: 6 },
];

export const cards: Card[] = [
  { id: 'c1', collectionId: 'piska', emoji: '🟥', rarity: 'common' },
  { id: 'c2', collectionId: 'bored', emoji: '🦍', rarity: 'epic' },
  { id: 'c3', collectionId: 'azuki', emoji: '😈', rarity: 'rare' },
  { id: 'c4', collectionId: 'pudgy', emoji: '🐧', rarity: 'common' },
  { id: 'c5', collectionId: 'doodles', emoji: '🎨', rarity: 'legendary' },
  { id: 'c6', collectionId: 'punks', emoji: '👾', rarity: 'rare' },
];


