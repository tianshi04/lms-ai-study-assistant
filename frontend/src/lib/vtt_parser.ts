export interface VTTCue {
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
}

export function parseVTT(vttContent: string): VTTCue[] {
  const cues: VTTCue[] = [];
  // Normalize line endings
  const normalized = vttContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Split by double newlines (paragraphs/cues)
  const blocks = normalized.split(/\n\n+/);
  
  // Regex to match timestamp line: e.g. "00:00:01.000 --> 00:00:04.000" or similar
  const timeRegex = /(\d{2}:\d{2}:\d{2}[\.,]\d{3}) --> (\d{2}:\d{2}:\d{2}[\.,]\d{3})/;
  const shortTimeRegex = /(\d{2}:\d{2}[\.,]\d{3}) --> (\d{2}:\d{2}[\.,]\d{3})/;

  function parseTime(timeStr: string): number {
    const parts = timeStr.replace(",", ".").split(":");
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    if (parts.length === 3) {
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      seconds = parseFloat(parts[2]);
    } else if (parts.length === 2) {
      minutes = parseInt(parts[0], 10);
      seconds = parseFloat(parts[1]);
    }
    return hours * 3600 + minutes * 60 + seconds;
  }

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;
    
    // Find line with time arrow
    let timeIndex = -1;
    let match: RegExpMatchArray | null = null;
    for (let i = 0; i < lines.length; i++) {
      match = lines[i].match(timeRegex) || lines[i].match(shortTimeRegex);
      if (match) {
        timeIndex = i;
        break;
      }
    }
    
    if (timeIndex === -1 || !match) continue;
    
    const startTime = parseTime(match[1]);
    const endTime = parseTime(match[2]);
    
    // The rest is text content
    const textLines = lines.slice(timeIndex + 1);
    const text = textLines.join("\n").replace(/<[^>]*>/g, "").trim(); // strip HTML/cue styling tags
    
    if (text) {
      cues.push({ startTime, endTime, text });
    }
  }
  return cues;
}
