export function showUserGuide(lang = 'en') {
  const guides = {
    en: {
      title: "How to Use ISRCFinder",
      steps: [
        "1. Enter YouTube URL or let it auto-detect from current tab",
        "2. Click 'Get Info' to fetch video details",
        "3. Search Spotify using extracted title or manual input",
        "4. View results and click 'Details' for ISRC/UPC info",
        "5. Use additional features like batch processing, audio preview, and lyrics"
      ]
    },
    // Add translations for other languages...
  };

  const guide = guides[lang] || guides.en;
  
  const modal = document.createElement('div');
  modal.className = 'guide-modal';
  modal.innerHTML = `
    <div class="guide-content">
      <h2>${guide.title}</h2>
      <ul>
        ${guide.steps.map(step => `<li>${step}</li>`).join('')}
      </ul>
      <button class="btn btn-blue">Got it!</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('button').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}