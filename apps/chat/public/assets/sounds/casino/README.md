# Casino table sounds

From Kenney's "Casino Audio" pack (https://kenney.nl/assets/casino-audio), version 1.1, released under CC0 1.0 (public domain). Credit isn't required: thanks, Kenney.

Converted from the pack's Ogg Vorbis files to mono 96 kbps MP3 (Safari's Ogg support is unreliable) with `ffmpeg -i <name>.ogg -ac 1 -b:a 96k <name>.mp3`, keeping the pack's file names. Played by `src/games/casino/sounds.ts`.
