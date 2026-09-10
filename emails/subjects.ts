import { subject as subject1, preview as preview1 } from './welcome1';
import { subject as subject2, preview as preview2 } from './welcome2';
import { subject as subject3, preview as preview3 } from './welcome3';

const subjects = [subject1, subject2, subject3];
const previews = [preview1, preview2, preview3];

export function getWelcomeSubject(step: number): string {
  return subjects[step - 1] ?? '';
}

export function getWelcomePreview(step: number): string {
  return previews[step - 1] ?? '';
}
