export interface User {
  id: number;
  username: string;
}

export interface Cocktail {
  id: number;
  name: string;
  recipe: string;
  base_spirit: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  position: number;
  created_at: string;
}

// A placement records where one user has put one cocktail on their own board.
// category_id === null means it sits in that user's uncategorized pool.
export interface Placement {
  user_id: number;
  cocktail_id: number;
  category_id: number | null;
  position: number;
}

export interface Note {
  cocktail_id: number;
  user_id: number;
  username: string;
  body: string;
  updated_at: string;
}

export interface BoardState {
  users: User[];
  cocktails: Cocktail[];
  categories: Category[];
  placements: Placement[];
  notes: Note[];
}
