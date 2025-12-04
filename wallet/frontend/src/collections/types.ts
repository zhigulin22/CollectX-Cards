export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Collection {
  id: string;
  name: string;
  icon: string;
  owned: number;
  total: number;
}

export interface Card {
  id: string;
  collectionId: string;
  emoji: string;
  rarity: Rarity;
}


