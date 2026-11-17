import { tokenizationLab } from './tokenization-lab.mjs';
import { logprobsLab } from './logprobs-lab.mjs';
import { embeddingLab } from './embedding-lab.mjs';
import { imageGenerationLab } from './image-generation-lab.mjs';
import { visionLab } from './vision-lab.mjs';
import { speechLab } from './speech-lab.mjs';
import { diarizationLab } from './diarization-lab.mjs';
import { musicLab } from './music-lab.mjs';
import { videoLab } from './video-lab.mjs';
import { judgeLab } from './judge-lab.mjs';

export const genaiLabs = [tokenizationLab, logprobsLab, embeddingLab, imageGenerationLab, visionLab, speechLab, diarizationLab, musicLab, videoLab, judgeLab];

export function evaluateGenai(labId, results) {
  return genaiLabs.find(lab => lab.id === labId)?.evaluate(results);
}
