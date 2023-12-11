import App from './App.svelte';
console.log('building...');
const app = new App({
    "target": document.body,
    "context":[]
});
console.log("built");

export default app;