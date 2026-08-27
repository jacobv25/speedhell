# fx-shots — explosion frame strips (r8-fx dev tool)

`node tools/fx-shots/fx-shots.mjs` → headless Chrome renders each explosion tier
(POP/MED/BIG/PHASE/PLAYER + hit-flash) at frames 0,1,3,6,10,16,26,40 and writes one
strip per tier to `out/`. Uses the playwright headless-shell like `test/shots.mjs`.
Edit `fx-shots.html` to add scenes. Not part of the game or the referee.
