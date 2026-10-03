// "Seed" for the browser-backed demo: all state lives in localStorage (key: creatorai-v1) and is re-created from
// code on reset. This script prints the ways to reset it (there is no server DB).
console.log(`CreatorAi demo seed
  • In the app:   Ctrl+Shift+D → "Reset to seed state"   (or Settings → Reset demo data)
  • In DevTools:  localStorage.removeItem("creatorai-v1"); location.reload()
  • Media:        put sources in public/demo/g1…g5/, then run: npm run hash-demo`);
