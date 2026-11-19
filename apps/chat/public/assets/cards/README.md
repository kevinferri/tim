# Playing card faces

All 52 card faces come from RevK's SVG playing cards (https://www.me.uk/cards/, source at https://github.com/revk/SVG-playing-cards), released under CC0 1.0 (public domain). The court cards are traced from an out-of-copyright c.1870 Goodall & Son deck.

Generated with the deck maker (https://www.me.uk/cards/makeadeck.cgi) using: Poker size, Fancy ace of spades with the text "typetim.com" and a QR code for HTTPS://TYPETIM.COM/, Normal index style at Large index size, Normal pips, Modern court direction, and the rest at their defaults. Only the 52 faces are used (no jokers or backs).

Files are named `<rank><suit>.svg`: rank `A 2 3 4 5 6 7 8 9 T J Q K`, suit `S H D C`. They're used by `src/games/casino/components/playing-card.tsx`, after `scripts/tune-card-index.mjs` shrinks the corner index to midway between the generator's Medium and Large sizes. To regenerate: make the deck with the settings above, copy the 52 faces here, then run that script.
