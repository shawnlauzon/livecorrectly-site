import { subject as subject0, preview as preview0 } from './welcome0';
import { subject as subject1, preview as preview1 } from './welcome1';
import { subject as subject2, preview as preview2 } from './welcome2';
import { subject as subject3, preview as preview3 } from './welcome3';

const subjects = [subject0, subject1, subject2, subject3];
const previews = [preview0, preview1, preview2, preview3];

export function getWelcomeSubject(step: number): string {
  return subjects[step] ?? '';
}

export function getWelcomePreview(step: number): string {
  return previews[step] ?? '';
}
