export function compareTracksFeature(resultsDiv) {
  const compareBtn = document.createElement('button');
  compareBtn.className = 'btn btn-purple';
  compareBtn.innerHTML = '🔄 Compare Tracks';
  
  let selectedTracks = [];
  
  compareBtn.addEventListener('click', () => {
    const tracks = resultsDiv.querySelectorAll('.result-item');
    tracks.forEach(track => {
      track.classList.add('selectable');
      track.addEventListener('click', () => {
        track.classList.toggle('selected');
        if (track.classList.contains('selected')) {
          selectedTracks.push(track);
        } else {
          selectedTracks = selectedTracks.filter(t => t !== track);
        }
        
        if (selectedTracks.length === 2) {
          showComparison(selectedTracks[0], selectedTracks[1]);
        }
      });
    });
  });
  
  return compareBtn;
}