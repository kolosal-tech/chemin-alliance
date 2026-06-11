import sharp from "sharp";

const icon = (pad) => Buffer.from(`
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="${pad ? 0 : 110}" fill="#131D33"/>
  <line x1="116" y1="256" x2="396" y2="256" stroke="#2A3550" stroke-width="14"/>
  <line x1="116" y1="256" x2="256" y2="256" stroke="#C9A84C" stroke-width="18" stroke-linecap="round"/>
  <circle cx="116" cy="256" r="26" fill="#C9A84C"/>
  <circle cx="186" cy="256" r="22" fill="#C9A84C"/>
  <circle cx="256" cy="256" r="32" fill="#C9A84C" stroke="#131D33" stroke-width="10"/>
  <circle cx="326" cy="256" r="18" fill="#131D33" stroke="#5C657D" stroke-width="8"/>
  <circle cx="396" cy="256" r="18" fill="#131D33" stroke="#5C657D" stroke-width="8"/>
</svg>`);

await sharp(icon(false)).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(icon(false)).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(icon(true)).resize(512, 512).png().toFile("public/icons/maskable-512.png");
await sharp(icon(false)).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
console.log("icons OK");
