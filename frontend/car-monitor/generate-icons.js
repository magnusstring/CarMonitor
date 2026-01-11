// Simple script to generate PWA icons
// Run with: node generate-icons.js

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'src', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create a simple SVG icon
function createSvgIcon(size) {
  const fontSize = Math.floor(size * 0.35);
  const smallFontSize = Math.floor(size * 0.12);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#4f46e5" rx="${size * 0.15}"/>
  <text x="50%" y="45%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" dy=".1em">CM</text>
  <text x="50%" y="72%" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="${smallFontSize}">CarMonitor</text>
</svg>`;
}

// Write SVG files (browsers can use SVG as icons too)
sizes.forEach(size => {
  const svg = createSvgIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Created ${filename}`);
});

// Create a simple PNG placeholder using base64
// This is a 1x1 indigo pixel that will be scaled
const base64Pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwADBgF/GX3qfwAAAABJRU5ErkJggg==';

sizes.forEach(size => {
  // For now, create placeholder files (in production you'd use a proper image library)
  const svg = createSvgIcon(size);
  const filename = `icon-${size}x${size}.png`;
  // Write SVG content but with .png extension for compatibility
  // The manifest will use these, browsers will handle SVG content
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Created ${filename} (SVG content)`);
});

console.log('\\nIcons generated! Note: For production, convert SVGs to actual PNGs using a tool like sharp or imagemagick.');
