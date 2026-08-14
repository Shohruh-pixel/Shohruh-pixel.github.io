import { computed } from "vue";
import { useFavoritesStore } from "../stores/favorites";

export function useFavorites() {
  const favoritesStore = useFavoritesStore();

  return {
    favoriteIds: computed(() => favoritesStore.bankIds),
    favoritesCount: computed(() => favoritesStore.count),
    isFavorite: (bankId) => favoritesStore.isFavorite(bankId),
    toggleFavorite: (bankId) => favoritesStore.toggleFavorite(bankId)
  };
}

