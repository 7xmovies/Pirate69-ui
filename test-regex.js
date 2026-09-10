const links = [
  {
    "label": "Season 4 (Episode.01-7 Added) {Hindi-English} 480p AMZN WEB-DL x264 [140MB/E] - ⚡ G-Direct [Instant]",
    "quality": "480p x264 WEB-DL",
  },
  {
    "label": "The Matrix 1999 1080p WEB-DL",
    "quality": "1080p",
  },
  {
    "label": "S04E07 WEB-DL 720p",
    "quality": "720p",
  }
];

const groups = {};
links.forEach(link => {
     let groupName = link.quality || 'Standard';
     const name = link.label || link.name || '';
     
     const seasonMatch = name.match(/Season\s\d+/i) || name.match(/S\d+/i);
     if (seasonMatch) {
        groupName = `${groupName} - ${seasonMatch[0].toUpperCase()}`;
     }
     
     if (!groups[groupName]) {
       groups[groupName] = [];
     }
     groups[groupName].push(link);
});
console.log(groups);
