import type { CosmeticItem } from "./api";

export const localizedCosmeticName = (
  item: CosmeticItem,
  locale: string,
): string =>
  item.localizedNames[locale]
  ?? item.localizedNames[locale.split("-")[0] ?? ""]
  ?? (locale === "ko" ? item.nameKo : item.nameEn);

const categoryDescriptions: Record<
  Exclude<CosmeticItem["category"], "tile_color" | "profile">,
  Record<string, string>
> = {
  board_theme: {
    en: "Changes the frame, play field, and every empty cell across the whole board.",
    ja: "フレーム、盤面、すべての空きマスを含むゲーム盤全体の見た目を変更します。",
    es: "Cambia el marco, el campo y todas las casillas vacías del tablero.",
    "pt-BR": "Altera a moldura, o campo e todas as casas vazias do tabuleiro.",
  },
  placement_effect: {
    en: "Plays around a tile at the moment you place it on the board.",
    ja: "タイルを盤面に置いた瞬間、その周囲で再生されます。",
    es: "Se reproduce alrededor de una ficha al colocarla en el tablero.",
    "pt-BR": "É reproduzido ao redor da peça quando ela é colocada no tabuleiro.",
  },
  score_effect: {
    en: "Plays over a completed connection while the scoring tiles disappear.",
    ja: "得点ラインが完成し、対象タイルが消えるときに再生されます。",
    es: "Se reproduce sobre una conexión completada mientras desaparecen las fichas puntuadas.",
    "pt-BR": "É reproduzido sobre uma conexão completa enquanto as peças de pontuação desaparecem.",
  },
  victory_effect: {
    en: "Changes the presentation shown when you win a match.",
    ja: "対戦に勝利したときに表示される演出を変更します。",
    es: "Cambia la presentación que aparece al ganar una partida.",
    "pt-BR": "Altera a apresentação exibida ao vencer uma partida.",
  },
};

export const localizedCosmeticDescription = (
  item: CosmeticItem,
  locale: string,
): string => {
  if (locale === "ko" || locale.startsWith("ko-")) return item.descriptionKo;
  if (item.category === "tile_color" || item.category === "profile") return item.nameEn;

  const descriptions = categoryDescriptions[item.category];
  return descriptions[locale]
    ?? descriptions[locale.split("-")[0] ?? ""]
    ?? descriptions.en
    ?? item.nameEn;
};
