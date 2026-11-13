-- The Same Page play badge now clears on answering, not on opening the game.
ALTER TABLE "same_page_player_stats" DROP COLUMN "promptViewedGameDate";
